// QRIS (EMVCo Merchant Presented Mode): ubah QRIS statis merchant menjadi QRIS bernominal per pesanan.
// Pembeli cukup scan; nominal (termasuk kode unik) sudah terisi, uang tetap masuk ke merchant yang sama.
//
// Format: rangkaian TLV "TTLLVALUE" (tag 2 digit, panjang 2 digit). Tag 01 = point of initiation
// ("11" statis, "12" dinamis), tag 54 = nominal, tag 63 = CRC16-CCITT (poly 0x1021, init 0xFFFF) atas
// seluruh payload sampai dengan "6304".

/** QRIS statis SEVNSOUL STORE, DIGITAL & KREATIF (NMID ID1026625677186), dibaca dari gambar QRIS merchant. */
export const MERCHANT_STATIC_QRIS =
  '00020101021126610014COM.GO-JEK.WWW01189360091432741520200210G2741520200303UMI51440014ID.CO.QRIS.WWW0215ID10266256771860303UMI5204899953033605802ID5925Sevnsoul Store, Digital &6013JAKARTA TIMUR61051325062140703A0111036216304E0E9';

export interface TlvField {
  tag: string;
  value: string;
}

export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseTlv(payload: string): TlvField[] {
  const out: TlvField[] = [];
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len) || i + 4 + len > payload.length) {
      throw new Error('QRIS tidak valid');
    }
    out.push({ tag, value: payload.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  return out;
}

function field(tag: string, value: string): string {
  if (value.length > 99) throw new Error(`Nilai tag ${tag} terlalu panjang`);
  return tag + String(value.length).padStart(2, '0') + value;
}

/** true bila CRC di tag 63 cocok dengan isi payload. */
export function isValidQris(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== '6304') return false;
  return crc16Ccitt(payload.slice(0, -4)) === payload.slice(-4).toUpperCase();
}

/**
 * QRIS bernominal dari QRIS statis. Tag 01 diganti "12", tag 54 diisi nominal (rupiah bulat),
 * tag lain dipertahankan dalam urutan naik, lalu CRC dihitung ulang.
 */
export function toDynamicQris(staticPayload: string, amountIdr: number): string {
  if (!isValidQris(staticPayload)) throw new Error('QRIS statis tidak valid');
  if (!Number.isInteger(amountIdr) || amountIdr <= 0 || amountIdr > 99_999_999) throw new Error('Nominal tidak valid');
  const fields = parseTlv(staticPayload).filter(f => f.tag !== '63' && f.tag !== '54');
  const withAmount = fields.map(f => (f.tag === '01' ? { tag: '01', value: '12' } : f));
  withAmount.push({ tag: '54', value: String(amountIdr) });
  withAmount.sort((a, b) => Number(a.tag) - Number(b.tag));
  const body = withAmount.map(f => field(f.tag, f.value)).join('') + '6304';
  return body + crc16Ccitt(body);
}

/** Nominal di tag 54 (atau null untuk QRIS statis). */
export function qrisAmount(payload: string): number | null {
  const f = parseTlv(payload).find(x => x.tag === '54');
  return f ? Number(f.value) : null;
}
