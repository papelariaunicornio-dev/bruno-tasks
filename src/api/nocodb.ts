const BASE_URL = 'https://nocodb.papelariaunicornio.com.br/api/v1';
const TOKEN = 'HEP4jvJaAZRZxR75QX1HRb0HMgJ0R7_5-sEA5Orc';
const PROJECT_ID = 'pno23ac5b1mk990';

const TABLE_IDS = {
  lists: 'mlrmk00j1yt8lu4',
  tasks: 'mbwvnajz8dhecby',
  tags: 'mfbwbxaz2gx0lov',
  task_tags: 'mbyev47waz1oyo5',
} as const;

type TableName = keyof typeof TABLE_IDS;

const headers = {
  'xc-token': TOKEN,
  'Content-Type': 'application/json',
};

function url(table: TableName, id?: number): string {
  const base = `${BASE_URL}/db/data/noco/${PROJECT_ID}/${TABLE_IDS[table]}`;
  return id ? `${base}/${id}` : base;
}

export async function list<T>(
  table: TableName,
  params?: {
    where?: string;
    sort?: string;
    limit?: number;
    offset?: number;
    fields?: string;
  }
): Promise<T[]> {
  const searchParams = new URLSearchParams();
  if (params?.where) searchParams.set('where', params.where);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.fields) searchParams.set('fields', params.fields);
  searchParams.set('limit', String(params?.limit ?? 1000));

  const res = await fetch(`${url(table)}?${searchParams}`, { headers });
  const data = await res.json();
  return data.list ?? [];
}

export async function get<T>(table: TableName, id: number): Promise<T> {
  const res = await fetch(url(table, id), { headers });
  return res.json();
}

export async function create<T>(table: TableName, record: Partial<T>): Promise<T> {
  const res = await fetch(url(table), {
    method: 'POST',
    headers,
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function update<T>(table: TableName, id: number, record: Partial<T>): Promise<T> {
  const res = await fetch(url(table, id), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function remove(table: TableName, id: number): Promise<void> {
  await fetch(url(table, id), { method: 'DELETE', headers });
}

export async function bulkUpdate<T>(table: TableName, records: Partial<T>[]): Promise<void> {
  await fetch(`${url(table)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(records),
  });
}

export const api = { list, get, create, update, remove, bulkUpdate };
