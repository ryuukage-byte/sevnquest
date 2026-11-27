// Akses backend Toko Pack (RPC di supabase/migrations/20261127_store_packs.sql).
import { supabase } from './supabase';
import {
  parseOwnedPacks, parsePackContents, parsePassState, parseStoreCatalog,
  type OwnedPackRef, type PackContents, type PassState, type StoreCatalog,
} from './storeCore';

export async function fetchStoreCatalog(): Promise<StoreCatalog> {
  const { data, error } = await supabase.rpc('get_store_catalog');
  if (error) throw error;
  return parseStoreCatalog(data);
}

export async function fetchMyOwnedPacks(): Promise<OwnedPackRef[]> {
  const { data, error } = await supabase.rpc('list_my_packs');
  if (error) throw error;
  return parseOwnedPacks(data);
}

export async function fetchPackContents(packId: string): Promise<PackContents> {
  const { data, error } = await supabase.rpc('get_pack_contents', { p_pack_id: packId });
  if (error) throw error;
  const parsed = parsePackContents(data);
  if (!parsed) throw new Error('pack_not_found');
  return parsed;
}

/** Buka pack dengan pass. Mengembalikan isi pack dan saldo terbaru. */
export async function unlockPack(packId: string): Promise<{ contents: PackContents; pass: PassState }> {
  const { data, error } = await supabase.rpc('unlock_pack', { p_pack_id: packId });
  if (error) throw error;
  const contents = parsePackContents(data);
  if (!contents) throw new Error('pack_not_found');
  return { contents, pass: parsePassState((data as Record<string, unknown> | null)?.pass) };
}
