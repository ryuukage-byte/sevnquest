import { supabase } from './supabase';

const VISITOR_KEY = 'nq_visitor_id';
const LAST_PING_KEY = 'nq_visitor_last_ping';
const PING_INTERVAL_MS = 30 * 60 * 1000;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Catat kunjungan (tamu maupun login) ke app_visitors: ID acak per perangkat, maksimal sekali per 30 menit. */
export async function registerVisit(): Promise<void> {
  try {
    const last = Number(localStorage.getItem(LAST_PING_KEY)) || 0;
    if (Date.now() - last < PING_INTERVAL_MS) return;
    const { error } = await supabase.rpc('register_visit', { p_visitor_id: getVisitorId() });
    if (!error) localStorage.setItem(LAST_PING_KEY, String(Date.now()));
  } catch {
    /* penghitung tidak boleh mengganggu aplikasi */
  }
}
