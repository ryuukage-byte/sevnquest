-- ============================================================================
-- Pratinjau pack = 15 kata teratas lintas bab (sebelumnya hanya dari bab pertama).
-- Lalu hitung ulang pratinjau pack yang sudah ada. Idempoten.
-- ============================================================================

create or replace function public.upsert_pack_internal(p_meta jsonb, p_book jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id text := p_meta->>'id';
  v_count int;
  v_chapters jsonb;
  v_preview jsonb;
  v_sources jsonb;
  v_changed boolean;
  v_version int;
begin
  if v_id is null then raise exception 'invalid_pack'; end if;

  insert into packs (id, title, level, description, cover_icon, price_passes, status, sort_order)
  values (
    v_id, coalesce(p_meta->>'title', v_id), coalesce(p_meta->>'level', 'TEMATIK'), coalesce(p_meta->>'description', ''),
    coalesce(p_meta->>'cover_icon', 'package'), coalesce((p_meta->>'price_passes')::int, 1),
    coalesce(p_meta->>'status', 'draft'), coalesce((p_meta->>'sort_order')::int, 0)
  )
  on conflict (id) do update set
    title        = coalesce(p_meta->>'title', packs.title),
    level        = coalesce(p_meta->>'level', packs.level),
    description  = coalesce(p_meta->>'description', packs.description),
    cover_icon   = coalesce(p_meta->>'cover_icon', packs.cover_icon),
    price_passes = coalesce((p_meta->>'price_passes')::int, packs.price_passes),
    status       = coalesce(p_meta->>'status', packs.status),
    sort_order   = coalesce((p_meta->>'sort_order')::int, packs.sort_order),
    updated_at   = now();

  if p_book is not null then
    if jsonb_typeof(p_book->'chapters') <> 'array' then raise exception 'invalid_book'; end if;

    select count(distinct (it->>'category') || ':' || (it->>'id'))::int
      into v_count
      from jsonb_array_elements(p_book->'chapters') ch, jsonb_array_elements(ch->'items') it;
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', ch->>'id', 'title', coalesce(ch->>'titleId', ch->>'titleJp'),
             'count', jsonb_array_length(coalesce(ch->'items', '[]'::jsonb))
           ) order by (ch->>'chapterNumber')::int), '[]'::jsonb)
      into v_chapters
      from jsonb_array_elements(p_book->'chapters') ch;
    -- 15 kata teratas lintas bab (bab pertama bisa lebih pendek dari 15, mis. Wajib N2 hanya 2 kata).
    select coalesce(jsonb_agg(it order by co, io), '[]'::jsonb) into v_preview
      from (
        select it, co, io
          from jsonb_array_elements(p_book->'chapters') with ordinality c(ch, co),
               jsonb_array_elements(ch->'items') with ordinality i(it, io)
         order by co, io
         limit 15
      ) s;
    v_sources := coalesce(p_book->'sources', p_meta->'sources', '[]'::jsonb);

    select (c.book is distinct from p_book) into v_changed from pack_contents c where c.pack_id = v_id;
    insert into pack_contents (pack_id, book, content_version) values (v_id, p_book, 1)
    on conflict (pack_id) do update set
      book = excluded.book,
      content_version = pack_contents.content_version + case when coalesce(v_changed, true) then 1 else 0 end,
      updated_at = now()
    returning content_version into v_version;

    update packs set item_count = v_count, chapter_summary = v_chapters, preview = v_preview, sources = v_sources,
                     content_version = v_version, updated_at = now()
     where id = v_id;
  end if;

  return (select to_jsonb(p) from packs p where p.id = v_id);
end;
$$;
revoke all on function public.upsert_pack_internal(jsonb, jsonb) from public, anon, authenticated;

update public.packs p
   set preview = coalesce((
         select jsonb_agg(it order by co, io)
           from (
             select it, co, io
               from jsonb_array_elements(c.book->'chapters') with ordinality ch(chv, co),
                    jsonb_array_elements(chv->'items') with ordinality i(it, io)
              order by co, io
              limit 15
           ) s
       ), '[]'::jsonb)
  from public.pack_contents c
 where c.pack_id = p.id;
