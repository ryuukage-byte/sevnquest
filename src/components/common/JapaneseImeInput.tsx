import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CornerDownLeft, Languages } from 'lucide-react';
import { convertRomajiToKana, getHenkanCandidates, HenkanCandidate } from '../../utils/imeEngine';
import { playSound } from '../../utils/audio';

export interface JapaneseImeInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  contextWords?: string[];
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  soundEnabled?: boolean;
  showImeToggle?: boolean;
  isTextarea?: boolean;
  rows?: number;
}

export const JapaneseImeInput: React.FC<JapaneseImeInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ketik romaji/kana di sini...',
  contextWords = [],
  disabled = false,
  autoFocus = false,
  className = '',
  soundEnabled = true,
  showImeToggle = true,
  isTextarea = false,
  rows = 2,
}) => {
  const [imeActive, setImeActive] = useState<boolean>(true);
  const [composingRomaji, setComposingRomaji] = useState<string>('');
  const [composingKana, setComposingKana] = useState<string>('');
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [showCandidates, setShowCandidates] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // If the parent clears the input value externally (e.g. clicking "Hapus Teks"), reset composing state
  useEffect(() => {
    if (!value) {
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
      setActiveCandidateIndex(0);
    }
  }, [value]);

  // Generate candidates for the current composing token
  const candidates: HenkanCandidate[] = useMemo(() => {
    if (!imeActive || !composingKana.trim()) return [];
    return getHenkanCandidates(composingKana, contextWords);
  }, [imeActive, composingKana, contextWords]);

  useEffect(() => {
    setActiveCandidateIndex(0);
    setShowCandidates(candidates.length > 0 && focused);
  }, [candidates, focused]);

  const handleApplyCandidate = (cand: HenkanCandidate) => {
    playSound('click', soundEnabled);

    // Commit candidate text into the sentence
    const newCommitted = value + cand.text;
    onChange(newCommitted);

    // Clear active composition buffer for the next word
    setComposingRomaji('');
    setComposingKana('');
    setShowCandidates(false);
    setActiveCandidateIndex(0);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!imeActive) {
      if (e.key === 'Enter' && onSubmit && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    // 1. SPACE BAR: Commit selected candidate and advance to next word!
    if (e.key === ' ') {
      e.preventDefault();
      if (composingKana.length > 0) {
        if (candidates.length > 0) {
          const chosen = candidates[activeCandidateIndex] || candidates[0];
          handleApplyCandidate(chosen);
        } else {
          // Commit current kana as-is
          const newCommitted = value + composingKana;
          onChange(newCommitted);
          setComposingRomaji('');
          setComposingKana('');
          setShowCandidates(false);
        }
      } else {
        // When not composing, allow inserting regular space
        onChange(value + ' ');
      }
      return;
    }

    // 2. ENTER KEY: Commit composition as-is or submit full sentence
    if (e.key === 'Enter') {
      if (composingKana.length > 0) {
        e.preventDefault();
        const chosen = candidates[activeCandidateIndex] || { text: composingKana, type: 'hiragana' as const };
        handleApplyCandidate(chosen);
        return;
      }

      if (onSubmit && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
        return;
      }
    }

    // 3. BACKSPACE: Delete active composition buffer first, then committed text
    if (e.key === 'Backspace') {
      if (composingRomaji.length > 0) {
        e.preventDefault();
        const nextRomaji = composingRomaji.slice(0, -1);
        setComposingRomaji(nextRomaji);
        const nextKana = convertRomajiToKana(nextRomaji);
        setComposingKana(nextKana);
        if (!nextRomaji) {
          setShowCandidates(false);
        }
        return;
      }

      if (value.length > 0) {
        e.preventDefault();
        onChange(value.slice(0, -1));
        return;
      }
    }

    // 4. TAB / ARROW KEYS: Cycle candidate selection
    if (showCandidates && candidates.length > 0) {
      if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCandidateIndex(prev => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCandidateIndex(prev => (prev - 1 + candidates.length) % candidates.length);
        return;
      }
    }

    // 5. NUMBER KEYS 1-9: Directly pick candidate
    if (showCandidates && /^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < candidates.length) {
        e.preventDefault();
        handleApplyCandidate(candidates[idx]);
        return;
      }
    }

    // 6. ESCAPE: Close candidate bar
    if (e.key === 'Escape' && showCandidates) {
      e.preventDefault();
      setShowCandidates(false);
      return;
    }

    // 7. JAPANESE PUNCTUATION
    if (e.key === '.') {
      e.preventDefault();
      const prefix = composingKana ? (candidates[activeCandidateIndex]?.text || composingKana) : '';
      onChange(value + prefix + '。');
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      const prefix = composingKana ? (candidates[activeCandidateIndex]?.text || composingKana) : '';
      onChange(value + prefix + '、');
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
      return;
    }
    if (e.key === '?') {
      e.preventDefault();
      const prefix = composingKana ? (candidates[activeCandidateIndex]?.text || composingKana) : '';
      onChange(value + prefix + '？');
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
      return;
    }
    if (e.key === '!') {
      e.preventDefault();
      const prefix = composingKana ? (candidates[activeCandidateIndex]?.text || composingKana) : '';
      onChange(value + prefix + '！');
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
      return;
    }

    // 8. ALPHABET CHARACTERS (a-z, A-Z)
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && /^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const nextRomaji = composingRomaji + e.key.toLowerCase();
      setComposingRomaji(nextRomaji);
      const nextKana = convertRomajiToKana(nextRomaji);
      setComposingKana(nextKana);
      setShowCandidates(true);
      setActiveCandidateIndex(0);
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawVal = e.target.value;

    if (!imeActive) {
      onChange(rawVal);
      return;
    }

    // Fallback for mobile virtual keyboards or direct input
    if (!composingRomaji) {
      onChange(rawVal);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      onChange(value + (composingKana || '') + pasted);
      setComposingRomaji('');
      setComposingKana('');
      setShowCandidates(false);
    }
  };

  // Full displayed text inside the input: committed text + active composition
  const displayValue = value + composingKana;

  return (
    <div className="relative w-full space-y-1.5">
      <div
        className={`relative flex items-center rounded-2xl bg-surface-inset border transition-all ${
          focused
            ? 'border-border-subtle shadow-[inset_2px_2px_5px_var(--neu-d)]'
            : 'border-border-subtle shadow-[inset_2px_2px_5px_var(--neu-d),inset_-1px_-1px_3px_var(--neu-l)]'
        }`}
      >
        {/* Input / Textarea Element */}
        {isTextarea ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            value={displayValue}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 200);
            }}
            className={`w-full bg-transparent px-4 py-3 text-sm sm:text-base font-jp font-medium text-text-primary placeholder:text-text-muted placeholder:font-body outline-hidden resize-none ${className}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={displayValue}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 200);
            }}
            className={`w-full bg-transparent px-4 py-3 text-sm sm:text-base font-jp font-medium text-text-primary placeholder:text-text-muted placeholder:font-body outline-hidden ${className}`}
          />
        )}

        {/* Right Action Icons (Input Mode Toggle & Commit Hint) */}
        <div className="flex items-center gap-1.5 pr-3 shrink-0">
          {showImeToggle && (
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setImeActive(prev => !prev);
                if (inputRef.current) inputRef.current.focus();
              }}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                imeActive
                  ? 'bg-gold/20 text-gold border border-border-subtle shadow-xs'
                  : 'bg-surface-card text-text-muted border border-border-subtle hover:text-text-primary'
              }`}
              title={imeActive ? 'Input Jepang Aktif (Romaji -> Kana)' : 'Mode Huruf Latin'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{imeActive ? 'あ' : 'A'}</span>
            </button>
          )}

          {onSubmit && (value.trim().length > 0 || composingKana.trim().length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (composingKana.length > 0) {
                  const chosen = candidates[activeCandidateIndex] || { text: composingKana, type: 'hiragana' as const };
                  handleApplyCandidate(chosen);
                } else if (onSubmit) {
                  onSubmit();
                }
              }}
              className="btn-physical-secondary w-7 h-7 rounded-lg hover:text-gold flex items-center justify-center transition-all cursor-pointer p-0"
              title="Konfirmasi / Kirim Kalimat (Enter)"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Candidate Bar (Pilihan Kata) */}
      {showCandidates && candidates.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap p-2 bg-surface-card border border-border-subtle rounded-2xl shadow-[3px_3px_10px_var(--neu-d)] animate-fade-in z-20">
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-text-muted px-1.5 shrink-0">
            <span>Pilihan Kata:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {candidates.slice(0, 6).map((cand, idx) => {
              const isSelected = idx === activeCandidateIndex;
              return (
                <button
                  key={`${cand.text}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleApplyCandidate(cand);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-jp font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                    isSelected
                      ? 'seg-active text-gold font-black scale-105'
                      : 'bg-surface-inset hover:bg-surface-elevated text-text-primary border border-border-subtle hover:border-border-primary'
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isSelected ? 'opacity-80' : 'text-text-muted'}`}>
                    {idx + 1}.
                  </span>
                  <span className="text-sm">{cand.text}</span>
                  {cand.label && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-medium ${
                      isSelected ? 'bg-surface-base/20 text-surface-base' : 'bg-surface-card text-text-muted'
                    }`}>
                      {cand.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-mono text-text-muted ml-auto pr-1 hidden sm:inline-block">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-surface-inset border border-border-subtle font-bold text-gold">Space</kbd> untuk pilih & lanjut kata berikutnya
          </span>
        </div>
      )}
    </div>
  );
};
