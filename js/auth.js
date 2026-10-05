(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const Pages = Store.Pages = Store.Pages || {};
  function currentUser() { const session = Store.storage.session(); return session && session.user ? session.user : null; }
  function isAdmin() { const user = currentUser(); return Boolean(user && user.role === 'admin'); }
  function saveSession(session) { Store.storage.saveSession(session); Store.fire('ceg:session-changed'); }
  async function profileFor(id, accessToken) {
    const rows = await Store.supabase.rest('profiles', { id: 'eq.' + id, select: '*' }, accessToken ? { token: accessToken } : undefined);
    return rows && rows[0] ? rows[0] : null;
  }
  async function login(email, password, adminOnly) {
    if (!Store.useSupabase) throw new Error('Store account service is unavailable.');
    if (adminOnly) throw new Error(t('adminError'));
    const cleanEmail = String(email || '').trim().toLowerCase();
    const response = await Store.supabase.auth.signIn(cleanEmail, password);
    let profile = null;
    try { profile = await profileFor(response.user.id, response.access_token); } catch (_) {}
    const user = {
      id: response.user.id,
      email: response.user.email || cleanEmail,
      fullName: profile && profile.full_name || response.user.user_metadata && response.user.user_metadata.full_name || '',
      phone: profile && profile.phone || '',
      role: profile && profile.role || 'customer'
    };
    saveSession({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: response.expires_at || Math.floor(Date.now() / 1000) + Number(response.expires_in || 3600),
      user: user
    });
    return user;
  }
  async function register(data) {
    if (!Store.useSupabase) throw new Error('Store account service is unavailable.');
    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.fullName || '').trim();
    const redirectTo = new URL(Store.url('login.html?confirmed=1'), window.location.href).href;
    const response = await Store.supabase.auth.signUp(email, data.password, { full_name: name, phone: data.phone || '' }, redirectTo);
    if (!response.session) return { pendingVerification: true };
    const user = { id: response.user.id, email: response.user.email || email, fullName: name, phone: data.phone || '', role: 'customer' };
    saveSession({ access_token: response.session.access_token, refresh_token: response.session.refresh_token, expires_at: response.session.expires_at, user: user });
    return { user: user };
  }
  async function logout() {
    if (Store.useSupabase && Store.storage.session()) { try { await Store.supabase.auth.signOut(); } catch (_) {} }
    saveSession(null);
  }
  async function saveProfile(data) {
    const current = currentUser(); if (!current) throw new Error(t('profileNeedsLogin'));
    if (!Store.useSupabase) throw new Error('Store account service is unavailable.');
    await Store.repo.updateCustomer(current.id, { fullName: data.fullName, phone: data.phone });
    const updated = Object.assign({}, current, { fullName: String(data.fullName || '').trim(), phone: String(data.phone || '').trim() });
    const session = Store.storage.session(); session.user = updated; saveSession(session); return updated;
  }
  async function resetPassword(email) {
    if (!Store.useSupabase) throw new Error('Store account service is unavailable.');
    const redirectTo = new URL(Store.url('forgot-password.html'), window.location.href).href;
    return Store.supabase.auth.resetPassword(email, redirectTo);
  }
  async function updatePassword(password) {
    if (!Store.useSupabase || !Store.storage.session()) throw new Error(t('recoveryExpired'));
    await Store.supabase.auth.updatePassword(password);
    const session = Store.storage.session(); session.recovery = false; saveSession(session);
    return true;
  }
  async function init() {
    if (!Store.useSupabase) return currentUser();
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const hashAccess = hash.get('access_token');
    if (hashAccess && hash.get('refresh_token')) {
      try {
        const authUser = await Store.supabase.auth.getUser(hashAccess);
        let profile = null;
        try { profile = await profileFor(authUser.id, hashAccess); } catch (_) {}
        const user = { id: authUser.id, email: authUser.email || '', fullName: profile && profile.full_name || authUser.user_metadata && authUser.user_metadata.full_name || '', phone: profile && profile.phone || '', role: profile && profile.role || 'customer' };
        saveSession({ access_token: hashAccess, refresh_token: hash.get('refresh_token'), expires_at: Number(hash.get('expires_in') || 3600) + Math.floor(Date.now() / 1000), user: user, recovery: hash.get('type') === 'recovery' });
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
        return user;
      } catch (_) { window.history.replaceState({}, '', window.location.pathname + window.location.search); }
    }
    const session = Store.storage.session();
    if (!session || !session.access_token) return null;
    const expires = Number(session.expires_at || 0);
    if (expires && expires < Math.floor(Date.now() / 1000) + 30 && session.refresh_token) {
      try {
        const refreshed = await Store.supabase.auth.refresh(session.refresh_token);
        saveSession(Object.assign({}, session, { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: refreshed.expires_at }));
      } catch (_) { saveSession(null); return null; }
    }
    return currentUser();
  }
  function field(name, label, type, extra) {
    return '<label class="field"><span>' + label + '</span><input name="' + name + '" type="' + (type || 'text') + '" ' + (extra || '') + '></label>';
  }
  function authVisual() {
    return '<aside class="auth-visual"><img src="' + Store.asset('assets/images/hero-editorial.jpg') + '" alt="" loading="lazy"><span class="auth-visual-shade"></span><div><span class="eyebrow">CENTER EL GOWAILY · CAIRO</span><h2>' + t('storyTitle') + '</h2><p>' + t('storyBody') + '</p></div><span class="auth-visual-mark">ج</span></aside>';
  }
  Pages.login = function (root) {
    const adminOnly = document.body.dataset.page === 'admin-login';
    const formTitle = adminOnly ? t('adminLogin') : t('loginTitle');
    const heading = adminOnly ? t('adminLogin') : t('signIn');
    root.innerHTML = '<div class="page-wrap auth-page"><div class="auth-panel"><div class="auth-form-area"><a class="auth-back" href="' + Store.url(adminOnly ? 'admin/index.html' : 'index.html') + '">← ' + t('backHome') + '</a><span class="eyebrow">' + heading + '</span><h1>' + (adminOnly ? t('adminLogin') : t('loginTitle')) + '</h1><p class="auth-intro">' + (adminOnly ? t('adminLoginNotice') : t('loginBody')) + '</p>' + (!adminOnly && Store.query('confirmed') ? '<div class="form-success">' + t('emailVerified') + '</div>' : !adminOnly && Store.query('verify') ? '<div class="form-success">' + t('verificationSent') + '</div>' : '') + '<form id="login-form" class="auth-form"><label class="field"><span>' + t('email') + '</span><input name="email" type="email" autocomplete="email" required></label><label class="field"><span>' + t('password') + '</span><input name="password" type="password" autocomplete="current-password" required minlength="8"></label><div id="auth-error" class="form-error" role="alert" hidden></div><div class="auth-form-meta">' + (!adminOnly ? '<a href="' + Store.url('forgot-password.html') + '">' + t('forgotPassword') + '</a>' : '') + '</div><button class="button button-primary button-full" type="submit">' + t('signIn') + C().icon('arrow', 16) + '</button></form>' + (!adminOnly ? '<p class="auth-switch">' + t('noAccount') + ' <a href="' + Store.url('register.html') + '">' + t('createAccount') + '</a></p>' : '<p class="auth-switch"><a href="' + Store.url('login.html') + '">' + t('signIn') + ' · ' + t('account') + '</a></p>') + '</div>' + authVisual() + '</div></div>';
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); const error = document.getElementById('auth-error'); error.hidden = true;
      if (!form.reportValidity()) return;
      const values = new FormData(form); const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = t('loading');
      try { const user = await login(values.get('email'), values.get('password'), adminOnly); window.location.href = Store.url(adminOnly ? 'admin/index.html' : (user.role === 'admin' ? 'admin/index.html' : 'profile.html')); }
      catch (reason) { error.textContent = reason.message || t('loginError'); error.hidden = false; submit.disabled = false; submit.innerHTML = t('signIn') + C().icon('arrow', 16); }
    });
  };
  Pages.register = function (root) {
    root.innerHTML = '<div class="page-wrap auth-page"><div class="auth-panel"><div class="auth-form-area"><a class="auth-back" href="' + Store.url('index.html') + '">← ' + t('backHome') + '</a><span class="eyebrow">' + t('register') + '</span><h1>' + t('createAccount') + '</h1><p class="auth-intro">' + t('registerBody') + '</p><form id="register-form" class="auth-form"><label class="field"><span>' + t('fullName') + '</span><input name="fullName" autocomplete="name" required minlength="2"></label><label class="field"><span>' + t('email') + '</span><input name="email" type="email" autocomplete="email" required></label><label class="field"><span>' + t('phone') + '</span><input name="phone" type="tel" autocomplete="tel" required></label><label class="field"><span>' + t('password') + '</span><input name="password" type="password" autocomplete="new-password" required minlength="8"></label><label class="field"><span>' + t('confirmPassword') + '</span><input name="confirmPassword" type="password" autocomplete="new-password" required minlength="8"></label><div id="auth-error" class="form-error" role="alert" hidden></div><button class="button button-primary button-full" type="submit">' + t('createAccount') + C().icon('arrow', 16) + '</button></form><p class="auth-switch">' + t('haveAccount') + ' <a href="' + Store.url('login.html') + '">' + t('signIn') + '</a></p><p class="demo-notice-inline">' + t('demoOnlyAuth') + '</p></div>' + authVisual() + '</div></div>';
    const form = document.getElementById('register-form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); const error = document.getElementById('auth-error'); error.hidden = true; if (!form.reportValidity()) return;
      const values = new FormData(form); if (values.get('password') !== values.get('confirmPassword')) { error.textContent = t('passwordMismatch'); error.hidden = false; return; }
      const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = t('loading');
      try { const result = await register({ fullName: values.get('fullName'), email: values.get('email'), phone: values.get('phone'), password: values.get('password') }); if (result.pendingVerification) { C().toast(Store.i18n.locale === 'ar' ? 'تحقق من بريدك لإكمال التسجيل.' : 'Check your email to complete registration.', 'success'); window.location.href = Store.url('login.html?verify=1'); } else window.location.href = Store.url('profile.html'); }
      catch (reason) { error.textContent = reason.message || t('registerError'); error.hidden = false; button.disabled = false; button.innerHTML = t('createAccount') + C().icon('arrow', 16); }
    });
  };
  Pages.forgot = function (root) {
    const session = Store.storage.session();
    const isRecovery = Boolean(Store.useSupabase && session && session.recovery);
    if (isRecovery) {
      root.innerHTML = '<div class="page-wrap auth-page auth-page-simple"><div class="auth-panel"><div class="auth-form-area"><a class="auth-back" href="' + Store.url('login.html') + '">← ' + t('signIn') + '</a><span class="eyebrow">' + t('account') + '</span><h1>' + t('resetTitle') + '</h1><p class="auth-intro">' + t('newPassword') + '</p><form id="new-password-form" class="auth-form"><label class="field"><span>' + t('newPassword') + '</span><input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label class="field"><span>' + t('confirmPassword') + '</span><input name="confirmPassword" type="password" required minlength="8" autocomplete="new-password"></label><div id="reset-message" class="form-error" role="alert" hidden></div><button class="button button-primary button-full" type="submit">' + t('updatePassword') + C().icon('arrow', 16) + '</button></form></div>' + authVisual() + '</div></div>';
      document.getElementById('new-password-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const values = new FormData(form); const box = document.getElementById('reset-message'); if (values.get('password') !== values.get('confirmPassword')) { box.textContent = t('passwordMismatch'); box.hidden = false; return; } try { await updatePassword(values.get('password')); C().toast(t('passwordUpdated')); window.location.href = Store.url('login.html'); } catch (error) { box.textContent = error.message || t('recoveryExpired'); box.hidden = false; } });
      return;
    }
    root.innerHTML = '<div class="page-wrap auth-page auth-page-simple"><div class="auth-panel"><div class="auth-form-area"><a class="auth-back" href="' + Store.url('login.html') + '">← ' + t('signIn') + '</a><span class="eyebrow">' + t('account') + '</span><h1>' + t('resetTitle') + '</h1><p class="auth-intro">' + t('resetBody') + '</p><form id="reset-form" class="auth-form"><label class="field"><span>' + t('email') + '</span><input name="email" type="email" required autocomplete="email"></label><div id="reset-message" class="form-success" hidden></div><button class="button button-primary button-full" type="submit">' + t('sendReset') + C().icon('arrow', 16) + '</button></form>' + '</div>' + authVisual() + '</div></div>';
    document.getElementById('reset-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const email = new FormData(form).get('email'); const box = document.getElementById('reset-message'); try { if (!Store.useSupabase) { box.className = 'form-error'; box.textContent = t('demoOnlyAuth'); box.hidden = false; return; } await resetPassword(email); box.textContent = t('resetSent'); box.hidden = false; } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  };
  Pages.profile = async function (root) {
    const user = currentUser();
    if (!user) { root.innerHTML = '<div class="page-wrap page-space">' + C().empty('user', t('profileNeedsLogin'), t('loginBody'), '<a class="button button-primary" href="' + Store.url('login.html') + '">' + t('signIn') + '</a>') + '</div>'; return; }
    const orderList = await Store.repo.listCustomerOrders(user.id).catch(function () { return []; });
    root.innerHTML = '<div class="page-wrap page-space profile-page"><div class="profile-welcome"><span class="profile-avatar">' + esc((user.fullName || user.email || 'G').charAt(0).toUpperCase()) + '</span><div><span class="eyebrow">' + t('account') + '</span><h1>' + esc(user.fullName || user.email) + '</h1><p>' + esc(user.email) + '</p></div><button class="button button-outline" type="button" data-action="sign-out">' + t('signOut') + '</button></div><div class="account-layout"><nav class="account-nav"><a class="active" href="' + Store.url('profile.html') + '">' + t('profileTitle') + '</a><a href="' + Store.url('orders.html') + '">' + t('orders') + ' <span>' + orderList.length + '</span></a><a href="' + Store.url('track.html') + '">' + t('trackOrder') + '</a></nav><section class="account-card"><span class="eyebrow">' + t('profileDetails') + '</span><h2>' + t('profileTitle') + '</h2><form id="profile-form" class="form-grid"><label class="field"><span>' + t('fullName') + '</span><input name="fullName" required minlength="2" value="' + esc(user.fullName) + '"></label><label class="field"><span>' + t('email') + '</span><input value="' + esc(user.email) + '" readonly aria-readonly="true"></label><label class="field"><span>' + t('phone') + '</span><input name="phone" type="tel" value="' + esc(user.phone) + '"></label><div class="field-wide"><button class="button button-primary" type="submit">' + t('saveChanges') + C().icon('arrow', 16) + '</button></div></form></section></div></div>';
    document.getElementById('profile-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const values = new FormData(form); try { await saveProfile({ fullName: values.get('fullName'), phone: values.get('phone') }); C().toast(t('changesSaved'), 'success'); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  };
  Store.Auth = { currentUser: currentUser, isAdmin: isAdmin, login: login, register: register, logout: logout, saveProfile: saveProfile, updatePassword: updatePassword, init: init };
})(window.Store);
