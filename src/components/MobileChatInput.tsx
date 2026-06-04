import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Send } from 'lucide-react';

/** iPhone/Android: contentEditable evita zoom do Safari em <input> */
function useEditableField(): boolean {
  const [editable, setEditable] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => {
      const ua = navigator.userAgent;
      setEditable(/iPhone|iPad|iPod|Android/i.test(ua) || mq.matches);
    };
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return editable;
}

interface MobileChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * No celular usa contentEditable (Safari não dá zoom).
 * No desktop usa <input> normal.
 */
export default function MobileChatInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  onFocus,
  onBlur
}: MobileChatInputProps) {
  const useEditable = useEditableField();
  const editableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!useEditable || !editableRef.current) return;
    if (editableRef.current.textContent !== value) {
      editableRef.current.textContent = value;
    }
  }, [value, useEditable]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  const fieldClass =
    'chat-msg-input flex-1 min-h-[48px] max-h-[120px] px-4 py-3 bg-zinc-900 border border-zinc-700/80 focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-white outline-none transition-colors touch-manipulation overflow-y-auto';

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5 items-end w-full">
      {useEditable ? (
        <div
          ref={editableRef}
          id="chat-msg-input"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={placeholder}
          tabIndex={0}
          className={`${fieldClass} empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-500 empty:before:pointer-events-none`}
          data-placeholder={placeholder}
          onInput={(e) => onChange(e.currentTarget.textContent || '')}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      ) : (
        <input
          ref={inputRef}
          id="chat-msg-input"
          type="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${fieldClass} placeholder:text-zinc-500`}
        />
      )}

      <button
        id="chat-send-btn"
        type="submit"
        className="w-11 h-11 min-h-[48px] bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-95 flex items-center justify-center text-zinc-950 rounded-2xl transition-all shrink-0 cursor-pointer shadow-lg shadow-amber-500/20 touch-manipulation"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
