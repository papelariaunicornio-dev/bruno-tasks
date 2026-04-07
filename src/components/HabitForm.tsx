import { useState, useEffect, useRef } from 'react';
import { useCreateHabit, useUpdateHabit, useDeleteHabit } from '../hooks/useHabits';
import { HABIT_COLORS } from '../types';
import type { Habit } from '../types';

interface HabitFormProps {
  habit?: Habit | null;
  onClose: () => void;
}

export function HabitForm({ habit, onClose }: HabitFormProps) {
  const [title, setTitle] = useState(habit?.title ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '');
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[4]);
  const inputRef = useRef<HTMLInputElement>(null);

  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    if (!title.trim()) return;
    if (habit) {
      updateHabit.mutate({ id: habit.Id, title: title.trim(), emoji, color });
    } else {
      createHabit.mutate({ title: title.trim(), emoji, color });
    }
    onClose();
  }

  function handleDelete() {
    if (!habit) return;
    if (!confirm(`Excluir habito "${habit.title}"?`)) return;
    deleteHabit.mutate(habit.Id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {habit ? 'Editar habito' : 'Novo habito'}
        </h2>

        {/* Title */}
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Nome
        </label>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Ex: Beber agua"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-base outline-none focus:border-[#15BFAE] mb-4"
        />

        {/* Emoji */}
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Emoji
        </label>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="😀"
            maxLength={4}
            className="w-16 text-2xl text-center border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-[#15BFAE]"
          />
          <span className="text-xs text-gray-400">
            <kbd className="bg-gray-100 px-1 rounded">Win+.</kbd> ou <kbd className="bg-gray-100 px-1 rounded">Cmd+Ctrl+Space</kbd>
          </span>
        </div>

        {/* Color */}
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Cor
        </label>
        <div className="flex gap-2 mb-6">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {habit ? (
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm bg-[#15BFAE] text-white font-medium rounded-md hover:bg-[#12a89a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {habit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
