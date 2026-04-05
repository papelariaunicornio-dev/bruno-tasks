import { useRef, useEffect } from 'react';
import { LIST_EMOJIS } from '../types';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 w-[220px]"
    >
      <div className="grid grid-cols-6 gap-1">
        {LIST_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg transition-colors"
            onClick={() => { onSelect(emoji); onClose(); }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        className="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 py-1"
        onClick={() => { onSelect(''); onClose(); }}
      >
        Remover emoji
      </button>
    </div>
  );
}
