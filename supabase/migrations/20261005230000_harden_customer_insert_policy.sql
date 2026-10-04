drop policy if exists "customers insert profile" on public.customers;
create policy "customers insert own profile" on public.customers
for insert to authenticated
with check (auth_user_id = auth.uid());
