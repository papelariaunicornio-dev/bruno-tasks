import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onUndo, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-gray-800 text-white px-5 py-3 rounded-lg shadow-xl text-base animate-[slideUp_0.2s_ease-out]">
      <span>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="font-semibold text-[#15BFAE] hover:text-[#14D9B5] transition-colors"
        >
          Desfazer
        </button>
      )}
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
