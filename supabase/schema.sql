-- Center El Gowaily customer store — Supabase/Postgres foundation
-- Apply in a fresh Supabase project using the SQL Editor. All public browser access
-- uses the anon key plus RLS. Never place a service_role key in the browser.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price > 0),
  sale_price numeric(12,2),
  sku text not null unique,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sale_price_check check (sale_price is null or (sale_price >= 0 and sale_price < price))
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_en text not null default '',
  alt_ar text not null default '',
  color_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Global catalogs help administration; actual variant combinations are product-specific.
create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  color_key text not null unique,
  name_en text not null,
  name_ar text not null,
  hex text not null default '#d6d0c4',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique,
  size_label text,
  color_key text,
  color_name_en text,
  color_name_ar text,
  color_hex text,
  price_override numeric(12,2),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variant_price_check check (price_override is null or price_override >= 0)
);
create unique index if not exists product_variants_combination_unique
  on public.product_variants(product_id, coalesce(size_label,''), coalesce(color_key,''));

create table if not exists public.inventory (
  product_variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= quantity),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default '',
  recipient_name text not null,
  phone text not null,
  governorate text not null,
  area text not null,
  address_line text not null,
  notes text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title_en text not null,
  title_ar text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  scope text not null default 'global' check (scope in ('global','category','product')),
  target_ids uuid[] not null default '{}'::uuid[],
  min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
  max_discount numeric(12,2) check (max_discount is null or max_discount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  priority integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_percentage_check check (discount_type <> 'percentage' or discount_value <= 100),
  constraint promotions_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  governorate text not null,
  area text not null,
  delivery_address text not null,
  notes text not null default '',
  payment_method text not null check (payment_method in ('cash_on_delivery','card_on_delivery')),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  promotion_code text,
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_snapshot jsonb not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists products_category_active_idx on public.products(category_id, is_active, created_at desc);
create index if not exists products_featured_active_idx on public.products(is_featured, is_active);
create index if not exists product_images_product_sort_idx on public.product_images(product_id, sort_order);
create index if not exists variants_product_active_idx on public.product_variants(product_id, is_active);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists addresses_user_default_idx on public.addresses(user_id, is_default desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array['profiles','categories','products','sizes','colors','product_variants','inventory','addresses','store_settings','promotions','orders'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', tbl, tbl);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
  end loop;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator may change profile roles';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation before update on public.profiles
for each row execute function public.prevent_role_escalation();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.profiles(id, email, full_name, phone, role)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''), 'customer')
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, phone = excluded.phone;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.record_order_status_event()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events(order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists orders_record_status_event on public.orders;
create trigger orders_record_status_event after update of status on public.orders
for each row execute function public.record_order_status_event();

-- Serialized order shape used only by the checkout and phone-verified tracking RPCs.
create or replace function public.order_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select to_jsonb(o) || jsonb_build_object(
    'customer_phone', o.customer_phone,
    'delivery_address', jsonb_build_object('governorate',o.governorate,'area',o.area,'address',o.delivery_address,'notes',o.notes),
    'items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at, oi.id) from public.order_items oi where oi.order_id=o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status',oe.status,'at',oe.created_at,'note',oe.note) order by oe.created_at,oe.id) from public.order_events oe where oe.order_id=o.id), '[]'::jsonb)
  ) from public.orders o where o.id = p_order_id;
$$;
revoke all on function public.order_json(uuid) from public;

-- Checkout price, delivery and inventory are calculated here, not trusted from the browser.
create or replace function public.place_order(p_order jsonb)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_quantity integer;
  v_variant_id uuid;
  v_variant_found boolean;
  v_stock integer;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2);
  v_settings jsonb;
  v_threshold numeric(12,2);
  v_order_id uuid;
  v_order_number text;
  v_name text;
  v_email text;
  v_phone text;
  v_governorate text;
  v_area text;
  v_address text;
  v_notes text;
  v_payment text;
  v_snapshot jsonb;
  v_image text;
begin
  v_name := trim(coalesce(p_order->>'customer_name',''));
  v_email := nullif(trim(coalesce(p_order->>'customer_email','')),'');
  v_phone := trim(coalesce(p_order->>'customer_phone',''));
  v_governorate := trim(coalesce(p_order->>'governorate',''));
  v_area := trim(coalesce(p_order->>'area',''));
  v_address := trim(coalesce(p_order->>'delivery_address',''));
  v_notes := trim(coalesce(p_order->>'notes',''));
  v_payment := coalesce(p_order->>'payment_method','');
  if v_name = '' or v_phone = '' or v_governorate = '' or v_area = '' or v_address = '' then raise exception 'Customer and delivery details are required'; end if;
  if v_payment not in ('cash_on_delivery','card_on_delivery') then raise exception 'Unsupported payment method'; end if;
  if v_user_id is not null and v_email is null then select email into v_email from auth.users where id = v_user_id; end if;
  if coalesce(jsonb_typeof(p_order->'items'),'') <> 'array' then raise exception 'Items must be provided as an array'; end if;
  if jsonb_array_length(p_order->'items') = 0 then raise exception 'At least one item is required'; end if;
  if jsonb_array_length(p_order->'items') > 50 then raise exception 'Too many order lines'; end if;

  for v_item in select value from jsonb_array_elements(p_order->'items') loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 30 then raise exception 'Invalid item quantity'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and is_active = true for update;
    if not found then raise exception 'A product is unavailable'; end if;
    v_variant_id := nullif(v_item->>'variant_id','')::uuid;
    v_variant_found := false;
    v_stock := 0;
    v_unit_price := coalesce(v_product.sale_price, v_product.price);
    v_snapshot := jsonb_build_object(
      'name_en',v_product.name_en,'name_ar',v_product.name_ar,'sku',v_product.sku,
      'image_url',null,'size_label',null,'color_key',null,'color_name_en',null,'color_name_ar',null,'color_hex',null
    );
    if v_variant_id is not null then
      select pv, i.quantity - i.reserved into v_variant, v_stock
      from public.product_variants pv join public.inventory i on i.product_variant_id = pv.id
      where pv.id = v_variant_id and pv.product_id = v_product.id and pv.is_active = true
      for update of pv, i;
      if not found then raise exception 'The selected variant is unavailable'; end if;
      v_variant_found := true;
      v_unit_price := coalesce(v_variant.price_override, v_product.sale_price, v_product.price);
      v_image := coalesce(v_variant.image_url, (select pi.image_url from public.product_images pi where pi.product_id=v_product.id and (pi.color_key is null or pi.color_key=v_variant.color_key) order by (pi.color_key=v_variant.color_key) desc nulls last, pi.sort_order limit 1));
      v_snapshot := jsonb_build_object(
        'name_en',v_product.name_en,'name_ar',v_product.name_ar,'sku',coalesce(v_variant.sku,v_product.sku),
        'image_url',v_image,'size_label',v_variant.size_label,'color_key',v_variant.color_key,
        'color_name_en',v_variant.color_name_en,'color_name_ar',v_variant.color_name_ar,'color_hex',v_variant.color_hex
      );
      if v_stock < v_quantity then raise exception 'Insufficient stock for a selected variant'; end if;
      update public.inventory set quantity = quantity - v_quantity, updated_at = now() where product_variant_id = v_variant.id;
    else
      if exists(select 1 from public.product_variants pv where pv.product_id=v_product.id and pv.is_active=true) then raise exception 'A size or colour must be selected'; end if;
      v_stock := v_product.stock_quantity;
      if v_stock < v_quantity then raise exception 'Insufficient stock'; end if;
      select pi.image_url into v_image from public.product_images pi where pi.product_id=v_product.id order by pi.sort_order limit 1;
      v_snapshot := jsonb_set(v_snapshot,'{image_url}',to_jsonb(coalesce(v_image,'')),true);
      update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id;
    end if;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'variant_id',case when v_variant_found then v_variant_id else null end,
      'product_snapshot',v_snapshot,'quantity',v_quantity,'unit_price',v_unit_price,'line_total',v_line_total
    ));
  end loop;

  select value into v_settings from public.store_settings where key='general';
  v_threshold := coalesce(nullif(v_settings->>'freeDeliveryThreshold','')::numeric, 2000);
  if v_threshold > 0 and v_subtotal >= v_threshold then v_delivery_fee := 0;
  else v_delivery_fee := coalesce(nullif(v_settings->>'deliveryFee','')::numeric, 60); end if;
  v_order_number := 'EG-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.orders(order_number,user_id,customer_name,customer_email,customer_phone,governorate,area,delivery_address,notes,payment_method,status,subtotal,delivery_fee,total)
  values(v_order_number,v_user_id,v_name,v_email,v_phone,v_governorate,v_area,v_address,v_notes,v_payment,'pending',v_subtotal,v_delivery_fee,v_subtotal+v_delivery_fee)
  returning id into v_order_id;
  insert into public.order_items(order_id,product_id,variant_id,product_snapshot,quantity,unit_price,line_total)
  select v_order_id,(value->>'product_id')::uuid,nullif(value->>'variant_id','')::uuid,value->'product_snapshot',(value->>'quantity')::integer,(value->>'unit_price')::numeric,(value->>'line_total')::numeric
  from jsonb_array_elements(v_items);
  insert into public.order_events(order_id,status,changed_by) values(v_order_id,'pending',v_user_id);
  return public.order_json(v_order_id);
end;
$$;

create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_order_id uuid;
  v_phone_digits text := right(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),10);
begin
  if length(v_phone_digits) < 8 then return null; end if;
  select id into v_order_id from public.orders
  where upper(order_number)=upper(trim(coalesce(p_order_number,'')))
    and right(regexp_replace(customer_phone,'[^0-9]','','g'),10)=v_phone_digits
  limit 1;
  if v_order_id is null then return null; end if;
  return public.order_json(v_order_id);
end;
$$;

create or replace function public.admin_save_product(p_product jsonb, p_images jsonb, p_variants jsonb)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_product_id uuid;
  v_image jsonb;
  v_variant jsonb;
  v_variant_id uuid;
  v_sku text;
  v_has_id boolean := nullif(p_product->>'id','') is not null;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if nullif(trim(coalesce(p_product->>'name_en','')),'') is null or nullif(trim(coalesce(p_product->>'name_ar','')),'') is null then raise exception 'Product names are required'; end if;
  if v_has_id then
    v_product_id := (p_product->>'id')::uuid;
    update public.products set
      slug=p_product->>'slug',name_en=p_product->>'name_en',name_ar=p_product->>'name_ar',
      description_en=coalesce(p_product->>'description_en',''),description_ar=coalesce(p_product->>'description_ar',''),
      category_id=nullif(p_product->>'category_id','')::uuid,price=(p_product->>'price')::numeric,
      sale_price=nullif(p_product->>'sale_price','')::numeric,sku=p_product->>'sku',is_active=coalesce((p_product->>'is_active')::boolean,true),
      is_featured=coalesce((p_product->>'is_featured')::boolean,false),stock_quantity=case when jsonb_array_length(coalesce(p_variants,'[]'::jsonb))>0 then 0 else coalesce((p_product->>'stock_quantity')::integer,0) end
    where id=v_product_id;
    if not found then raise exception 'Product not found'; end if;
    delete from public.product_images where product_id=v_product_id;
    delete from public.product_variants where product_id=v_product_id;
  else
    insert into public.products(slug,name_en,name_ar,description_en,description_ar,category_id,price,sale_price,sku,is_active,is_featured,stock_quantity)
    values(p_product->>'slug',p_product->>'name_en',p_product->>'name_ar',coalesce(p_product->>'description_en',''),coalesce(p_product->>'description_ar',''),nullif(p_product->>'category_id','')::uuid,(p_product->>'price')::numeric,nullif(p_product->>'sale_price','')::numeric,p_product->>'sku',coalesce((p_product->>'is_active')::boolean,true),coalesce((p_product->>'is_featured')::boolean,false),case when jsonb_array_length(coalesce(p_variants,'[]'::jsonb))>0 then 0 else coalesce((p_product->>'stock_quantity')::integer,0) end)
    returning id into v_product_id;
  end if;
  for v_image in select value from jsonb_array_elements(coalesce(p_images,'[]'::jsonb)) loop
    if nullif(trim(coalesce(v_image->>'image_url','')),'') is not null then
      insert into public.product_images(product_id,image_url,alt_en,alt_ar,color_key,sort_order)
      values(v_product_id,v_image->>'image_url',coalesce(v_image->>'alt_en',''),coalesce(v_image->>'alt_ar',''),nullif(v_image->>'color_key',''),(select count(*)::integer from public.product_images where product_id=v_product_id));
    end if;
  end loop;
  for v_variant in select value from jsonb_array_elements(coalesce(p_variants,'[]'::jsonb)) loop
    v_sku := nullif(trim(coalesce(v_variant->>'sku','')),'');
    insert into public.product_variants(product_id,sku,size_label,color_key,color_name_en,color_name_ar,color_hex,price_override,image_url,is_active)
    values(v_product_id,v_sku,nullif(trim(coalesce(v_variant->>'size_label','')),''),nullif(v_variant->>'color_key',''),nullif(v_variant->>'color_name_en',''),nullif(v_variant->>'color_name_ar',''),nullif(v_variant->>'color_hex',''),nullif(v_variant->>'price_override','')::numeric,nullif(v_variant->>'image_url',''),coalesce((v_variant->>'is_active')::boolean,true))
    returning id into v_variant_id;
    insert into public.inventory(product_variant_id,quantity,reserved) values(v_variant_id,greatest(coalesce((v_variant->>'stock_quantity')::integer,0),0),0);
  end loop;
  return v_product_id;
end;
$$;

-- Row-level security: client-side route guards are UX only; these policies are authoritative.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.sizes enable row level security;
alter table public.colors enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.addresses enable row level security;
alter table public.store_settings enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

drop policy if exists profiles_select_self_admin on public.profiles;
create policy profiles_select_self_admin on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists profiles_update_self_admin on public.profiles;
create policy profiles_update_self_admin on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon, authenticated using (is_active=true or public.is_admin());
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (is_active=true or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.is_active=true) or public.is_admin());
drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists sizes_public_read on public.sizes;
create policy sizes_public_read on public.sizes for select to anon, authenticated using (is_active=true or public.is_admin());
drop policy if exists sizes_admin_write on public.sizes;
create policy sizes_admin_write on public.sizes for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists colors_public_read on public.colors;
create policy colors_public_read on public.colors for select to anon, authenticated using (is_active=true or public.is_admin());
drop policy if exists colors_admin_write on public.colors;
create policy colors_admin_write on public.colors for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants for select to anon, authenticated using ((is_active=true and exists(select 1 from public.products p where p.id=product_id and p.is_active=true)) or public.is_admin());
drop policy if exists variants_admin_write on public.product_variants;
create policy variants_admin_write on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists inventory_public_read on public.inventory;
create policy inventory_public_read on public.inventory for select to anon, authenticated using (exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=product_variant_id and v.is_active=true and p.is_active=true) or public.is_admin());
drop policy if exists inventory_admin_write on public.inventory;
create policy inventory_admin_write on public.inventory for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists addresses_owner_all on public.addresses;
create policy addresses_owner_all on public.addresses for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());

drop policy if exists settings_public_read on public.store_settings;
create policy settings_public_read on public.store_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin_write on public.store_settings;
create policy settings_admin_write on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions for select to anon, authenticated using ((is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())) or public.is_admin());
drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_owner_admin_read on public.orders;
create policy orders_owner_admin_read on public.orders for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists order_items_owner_admin_read on public.order_items;
create policy order_items_owner_admin_read on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
drop policy if exists order_events_owner_admin_read on public.order_events;
create policy order_events_owner_admin_read on public.order_events for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));

-- Explicit table grants; RLS policies still limit which rows are visible or writable.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.sizes, public.colors, public.product_variants, public.inventory, public.store_settings, public.promotions to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images, public.sizes, public.colors, public.product_variants, public.inventory, public.addresses, public.store_settings, public.promotions to authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;
grant update on public.orders to authenticated;

grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.track_order(text,text) to anon, authenticated;
grant execute on function public.admin_save_product(jsonb,jsonb,jsonb) to authenticated;

-- Product image bucket. Admin uploads use the public URL returned by Supabase Storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists product_images_public_read_storage on storage.objects;
create policy product_images_public_read_storage on storage.objects for select to anon, authenticated using (bucket_id='product-images');
drop policy if exists product_images_admin_insert_storage on storage.objects;
create policy product_images_admin_insert_storage on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_update_storage on storage.objects;
create policy product_images_admin_update_storage on storage.objects for update to authenticated using (bucket_id='product-images' and public.is_admin()) with check (bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_delete_storage on storage.objects;
create policy product_images_admin_delete_storage on storage.objects for delete to authenticated using (bucket_id='product-images' and public.is_admin());

commit;

-- Admin bootstrap (run once after creating the first account in Supabase Auth):
-- update public.profiles set role='admin' where email='you@example.com';
-- Never expose a service_role key in the browser.
