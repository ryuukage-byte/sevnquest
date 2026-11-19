-- ============================================================================
-- Reset progres ikut menurunkan leaderboard.
--   upsert_leaderboard_entry sengaja tidak pernah menurunkan EXP/statistik (anti-curang), sehingga setelah
--   "Reset Progres Petualangan" nilai lama tetap tampil di leaderboard. RPC ini hanya bisa mengenolkan
--   baris milik pemanggil sendiri (tidak bisa menaikkan apa pun), plus skor Arena Mingguan minggu berjalan.
-- Idempoten.
-- ============================================================================

create or replace function public.reset_my_leaderboard()
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid text := auth.uid()::text;
  wk  text := to_char(now() at time zone 'UTC', 'IYYY"-W"IW');
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  update public.leaderboard set
    level          = 1,
    total_exp      = 0,
    tier_index     = 0,
    stat_tryout    = 0,
    stat_flashcard = 0,
    stat_kanji     = 0,
    stat_boss      = 0,
    last_updated   = now(),
    -- Kredit laju EXP mulai dari nol lagi (sama seperti baris baru).
    exp_credit_at  = now() - interval '12.5 minutes'
  where user_id = uid;
  delete from public.weekly_scores where user_id = uid and week_id = wk;
  delete from public.score_event_log where user_id = uid;
end;
$$;
revoke all on function public.reset_my_leaderboard() from public, anon;
grant execute on function public.reset_my_leaderboard() to authenticated;
