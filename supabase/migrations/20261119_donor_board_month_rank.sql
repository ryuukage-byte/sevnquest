-- ============================================================================
-- Papan donatur: tambah tingkat & peringkat donatur bulan ini (diurutkan dari total donasi bulanan).
-- Nominal tetap tidak dikirim ke klien; hanya tingkat (T0..T7) dan urutan peringkat.
-- Idempoten.
-- ============================================================================
drop function if exists public.get_donor_board();
create or replace function public.get_donor_board()
returns table (
  display_name text, is_anonymous boolean, badge_level int, badge_title text,
  is_lifetime boolean, monthly_this_month boolean, month_tier int, month_rank int
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_month text := wib_month();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    with totals as (
      select d.user_id,
             coalesce(sum(d.amount_idr) filter (where d.kind = 'lifetime'), 0)::int as life_total,
             coalesce(sum(d.amount_idr) filter (where d.kind = 'monthly' and d.month = v_month), 0)::int as month_total,
             bool_or(d.kind = 'monthly' and d.month = v_month) as this_month,
             max(d.created_at) filter (where d.kind = 'monthly' and d.month = v_month) as month_last
        from donations d
       group by d.user_id
    ), ranked as (
      select t.*,
             case when coalesce(t.this_month, false)
                  then (row_number() over (
                          partition by coalesce(t.this_month, false)
                          order by t.month_total desc, t.month_last asc nulls last))::int
             end as m_rank
        from totals t
    )
    select case when coalesce(p.anonymous, false) then null else coalesce(l.player_name, 'Petualang') end,
           coalesce(p.anonymous, false),
           (badge_for(r.life_total)->>'level')::int,
           badge_for(r.life_total)->>'title',
           exists (select 1 from user_subscriptions s where s.user_id = r.user_id and s.tier_code = 'lifetime'),
           coalesce(r.this_month, false),
           case when coalesce(r.this_month, false) then month_tier_for(r.month_total) else 0 end,
           r.m_rank
      from ranked r
      left join donor_preferences p on p.user_id = r.user_id
      left join leaderboard l on l.user_id = r.user_id::text
     where r.life_total >= 25000 or r.this_month
     order by 3 desc, r.life_total desc, 8 asc nulls last, 1;
end;
$$;
revoke all on function public.get_donor_board() from public, anon;
grant execute on function public.get_donor_board() to authenticated;
