-- DRAFT rollback untuk 20261009120000_guild_mvp.sql. Tidak menyentuh objek lain mana pun.
-- Tabel yang ada (leaderboard, weekly_scores, dst.) tidak diubah oleh migrasi Guild, jadi tidak ada yang dipulihkan.

drop function if exists
  public.guild_get_my(), public.guild_rotate_code(), public.guild_update(text), public.guild_kick(uuid),
  public.guild_leave(), public.guild_join(text), public.guild_preview(text), public.guild_create(text, text),
  public._guild_view(uuid), public._guild_sync(uuid), public._guild_baseline(uuid, uuid, text),
  public._guild_refresh_achieved(uuid, text[]), public._guild_touch_goal(uuid, text, boolean),
  public._guild_throttle(uuid, text, int, interval),
  public._guild_new_code(), public._guild_normalize_code(text), public._guild_clean_text(text, int),
  public.guild_level_for_points(bigint), public.guild_points_for_level(int),
  public._guild_week_id(timestamptz), public._guild_now(), public._guild_params();

drop table if exists
  public.guild_action_log, public.guild_weekly_goal, public.guild_weekly_contrib,
  public.guild_members, public.guilds;
