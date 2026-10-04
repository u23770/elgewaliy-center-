insert into public.product_images (product_id, url, alt_ar, alt_en, sort_order)
select p.id,
       v.url,
       p.name_ar,
       p.name_en,
       0
from (
  values
    ('kids-cotton-tshirt', 'https://images.unsplash.com/photo-1552873816-636e43209957?auto=format&fit=crop&q=82&w=1400'),
    ('boys-tracksuit', 'https://images.unsplash.com/flagged/photo-1555895361-b7fa814c0d26?auto=format&fit=crop&q=82&w=1400'),
    ('girls-dress', 'https://images.unsplash.com/photo-1590209447055-e53ad37a8004?auto=format&fit=crop&q=82&w=1400'),
    ('kids-summer-set', 'https://images.unsplash.com/photo-1766918780914-5df4a5a98c44?auto=format&fit=crop&q=82&w=1400')
) as v(slug, url)
join public.products p on p.slug = v.slug
where not exists (
  select 1 from public.product_images pi
  where pi.product_id = p.id
);
