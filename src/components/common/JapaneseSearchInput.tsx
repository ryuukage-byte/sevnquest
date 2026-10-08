import React from 'react';
import { Search, X } from 'lucide-react';

interface JapaneseSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** @deprecated tidak dipakai lagi (IME otomatis); dipertahankan agar pemanggil lama tetap valid. */
  placeholderIme?: string;
  placeholderLatin?: string;
  /** @deprecated tidak dipakai lagi (tombol IME dihapus). */
  soundEnabled?: boolean;
  autoFocus?: boolean;
  /** Kelas wadah (default: flex-1 agar mengisi baris filter). */
  className?: string;
  /** Kelas input; default = tampilan Library Kotoba/Bunpou. */
  inputClassName?: string;
}

const DEFAULT_INPUT_CLASS =
  'w-full pl-10 pr-20 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary transition-all shadow-inner font-medium font-jp';

/**
 * UI input pencarian materi Jepang (hanya tampilan). Logika pencarian ada di engine/search/universalSearch.
 * Tanpa toggle IME: engine pencarian mendeteksi sendiri romaji / kana / kanji / arti.
 */
export const JapaneseSearchInput: React.FC<JapaneseSearchInputProps> = ({
  value,
  onChange,
  placeholderLatin = 'Cari kata, romaji, arti...',
  autoFocus,
  className = 'flex-1',
  inputClassName = DEFAULT_INPUT_CLASS,
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      <input
        type="text"
        placeholder={placeholderLatin}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-6 h-6 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card flex items-center justify-center transition-all cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

      </div>
    </div>
  );
};
