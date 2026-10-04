create or replace function public.upsert_store_category(
  p_id uuid,
  p_name_ar text,
  p_name_en text,
  p_slug text,
  p_image_url text,
  p_sort_order integer,
  p_is_active boolean
)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_category public.categories;
begin
  select role into v_role from public.admins where auth_user_id = auth.uid() limit 1;
  if v_role is null or v_role not in ('admin','staff') then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name_ar),'') = '' or coalesce(trim(p_name_en),'') = '' or coalesce(trim(p_slug),'') = '' then raise exception 'invalid category'; end if;
  if p_id is null then
    insert into public.categories(name_ar,name_en,slug,image_url,sort_order,is_active)
    values(trim(p_name_ar),trim(p_name_en),lower(trim(p_slug)),nullif(trim(p_image_url),''),greatest(coalesce(p_sort_order,0),0),coalesce(p_is_active,true))
    returning * into v_category;
  else
    update public.categories set name_ar=trim(p_name_ar),name_en=trim(p_name_en),slug=lower(trim(p_slug)),image_url=nullif(trim(p_image_url),''),sort_order=greatest(coalesce(p_sort_order,0),0),is_active=coalesce(p_is_active,true)
    where id=p_id returning * into v_category;
    if not found then raise exception 'category not found'; end if;
  end if;
  return v_category;
end;
$$;
revoke all on function public.upsert_store_category(uuid,text,text,text,text,integer,boolean) from public;
grant execute on function public.upsert_store_category(uuid,text,text,text,text,integer,boolean) to authenticated;
