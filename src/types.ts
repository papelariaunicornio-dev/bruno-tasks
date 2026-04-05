export interface List {
  Id: number;
  title: string;
  group_name: string;
  position: number;
  created_at: string;
}

export interface Task {
  Id: number;
  title: string;
  description: string;
  completed: boolean;
  priority: boolean;
  position: number;
  list_id: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Tag {
  Id: number;
  name: string;
  color: string;
}

export interface TaskTag {
  Id: number;
  task_id: number;
  tag_id: number;
}

export type SortCriteria = 'manual' | 'alphabetical' | 'created' | 'priority';

export type ViewMode =
  | { type: 'list'; listId: number }
  | { type: 'tag'; tagId: number }
  | { type: 'all' }
  | { type: 'stats' };

export const TAG_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];
