/* Tiny, dependency-free Supabase REST/Auth client. Browser-visible anon keys are public; RLS is the security boundary. */
(function (Store) {
  const config = Store.config || {};
  const ready = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  function token() {
    const session = Store.storage && Store.storage.session();
    return session && session.access_token ? session.access_token : config.supabaseAnonKey;
  }
  async function request(path, options) {
    if (!ready) throw new Error('Supabase is not configured. Add the project URL and anon key to js/config.js.');
    const opts = options || {};
    const timeoutMs = Math.max(1000, Number(opts.timeoutMs || 12000));
    const headers = new Headers(opts.headers || {});
    headers.set('apikey', config.supabaseAnonKey);
    headers.set('Authorization', 'Bearer ' + (opts.token || token()));
    headers.set('Accept', 'application/json');
    if (opts.body !== undefined && !(opts.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (opts.prefer) headers.set('Prefer', opts.prefer);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;

    try {
      const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, ''), {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body === undefined ? undefined : (opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)),
        signal: controller ? controller.signal : undefined
      });
      const raw = await response.text();
      let payload = null;
      if (raw) { try { payload = JSON.parse(raw); } catch (_) { payload = raw; } }
      if (!response.ok) {
        const message = payload && (payload.message || payload.msg || payload.error_description || payload.error) || 'Supabase request failed (' + response.status + ')';
        const error = new Error(message);
        error.status = response.status;
        error.code = payload && payload.code;
        throw error;
      }
      return payload;
    } catch (error) {
      if (controller && controller.signal.aborted) {
        const timeoutError = new Error('Supabase request timed out. Please check your internet connection and try again.');
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function query(params) {
    const result = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      const value = params[key];
      if (value !== undefined && value !== null) result.set(key, String(value));
    });
    return result.toString();
  }
  const client = {
    ready: ready,
    rest: function (table, params, options) { const suffix = query(params); return request('rest/v1/' + encodeURIComponent(table) + (suffix ? '?' + suffix : ''), options); },
    rpc: function (name, body, options) { return request('rest/v1/rpc/' + encodeURIComponent(name), Object.assign({}, options || {}, { method: 'POST', body: body })); },
    auth: {
      signIn: function (email, password) { return request('auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }); },
      signUp: function (email, password, metadata, redirectTo) { const suffix = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''; return request('auth/v1/signup' + suffix, { method: 'POST', body: { email: email, password: password, data: metadata || {} } }); },
      signOut: function () { return request('auth/v1/logout', { method: 'POST', body: {} }); },
      getUser: function (accessToken) { return request('auth/v1/user', { method: 'GET', token: accessToken }); },
      updatePassword: function (password) { return request('auth/v1/user', { method: 'PUT', body: { password: password } }); },
      resetPassword: function (email, redirectTo) { const suffix = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''; return request('auth/v1/recover' + suffix, { method: 'POST', body: { email: email } }); },
      refresh: function (refreshToken) { return request('auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } }); }
    },
    upload: async function (bucket, objectPath, file, options) {
      if (!ready) throw new Error('Supabase is not configured.');
      const safePath = objectPath.split('/').map(encodeURIComponent).join('/');
      const headers = new Headers({ apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + token(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': options && options.upsert ? 'true' : 'false' });
      const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + safePath, { method: 'POST', headers: headers, body: file });
      if (!response.ok) throw new Error('Image upload failed (' + response.status + ').');
      return config.supabaseUrl.replace(/\/$/, '') + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + safePath;
    }
  };
  Store.supabase = client;
})(window.Store);
