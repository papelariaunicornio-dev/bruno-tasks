import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../store/appState';
import type { SortCriteria } from '../types';

const SORT_OPTIONS: { value: SortCriteria; label: string }[] = [
  { value: 'manual', label: 'Manual (drag & drop)' },
  { value: 'alphabetical', label: 'Alfabetica' },
  { value: 'created', label: 'Data de criacao' },
  { value: 'priority', label: 'Prioridade' },
];

export function SortMenu() {
  const [open, setOpen] = useState(false);
  const { sortBy, setSortBy } = useAppState();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Ordenar';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h12M3 18h6" />
        </svg>
        {currentLabel}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                sortBy === opt.value ? 'text-[#15BFAE] font-medium' : 'text-gray-600'
              }`}
              onClick={() => {
                setSortBy(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
