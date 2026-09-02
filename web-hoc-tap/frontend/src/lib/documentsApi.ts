const API_BASE = 'http://127.0.0.1:3005/api/documents';

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Không thể đồng bộ tài liệu');
  }
  return data;
}

export async function listDocuments(token: string, folderId?: string | null) {
  const url = folderId ? `${API_BASE}?folderId=${encodeURIComponent(folderId)}` : API_BASE;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res);
}

export async function createDocumentFolder(token: string, payload: { name: string; parentId?: string | null }) {
  const res = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function renameDocumentFolder(token: string, id: string, name: string) {
  const res = await fetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return parseResponse(res);
}

export async function deleteDocumentFolder(token: string, id: string) {
  const res = await fetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return parseResponse(res);
}

export async function createDocumentFile(token: string, payload: any) {
  const res = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function listDocumentFiles(token: string) {
  const res = await fetch(`${API_BASE}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res);
}

export async function getDocumentFile(token: string, id: string) {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res);
}

export async function renameDocumentFile(token: string, id: string, name: string) {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return parseResponse(res);
}

export async function deleteDocumentFile(token: string, id: string) {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return parseResponse(res);
}
