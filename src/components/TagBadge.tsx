import type { Tag } from '../types';

interface TagBadgeProps {
  tag: Tag;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export function TagBadge({ tag, onClick, removable, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
      style={{ backgroundColor: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {tag.name}
      {removable && (
        <button
          className="ml-0.5 hover:opacity-60"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          x
        </button>
      )}
    </span>
  );
}
