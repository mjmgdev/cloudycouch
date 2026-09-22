/**
 * Frontend API client for CloudyCouch Studio backend
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = (data && data.error) || (data && data.reason) || (typeof data === 'string' ? data : response.statusText);
    const error = new Error(message || `API error (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Status & Health
  getStatus: () => request('/status'),
  connect: (payload) => request('/connect', { method: 'POST', body: JSON.stringify(payload) }),
  testConnection: (payload) => request('/test-connection', { method: 'POST', body: JSON.stringify(payload) }),
  disconnect: () => request('/disconnect', { method: 'POST' }),
  connectSandbox: () => request('/connect-sandbox', { method: 'POST' }),
  toggleDemo: (enabled) => request('/demo/toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),

  // Databases
  listDatabases: () => request('/databases'),
  createDatabase: (name, partitioned = false) =>
    request('/databases', { method: 'POST', body: JSON.stringify({ name, partitioned }) }),
  deleteDatabase: (db) => request(`/databases/${encodeURIComponent(db)}`, { method: 'DELETE' }),
  getDatabaseInfo: (db) => request(`/databases/${encodeURIComponent(db)}/info`),

  // Documents
  getDocuments: (db, { limit = 25, skip = 0, partition, prefix } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (partition) params.append('partition', partition);
    if (prefix) params.append('prefix', prefix);
    return request(`/databases/${encodeURIComponent(db)}/docs?${params.toString()}`);
  },

  findDocuments: (db, query) =>
    request(`/databases/${encodeURIComponent(db)}/find`, {
      method: 'POST',
      body: JSON.stringify(query),
    }),

  getDocument: (db, id, options = {}) => {
    const params = new URLSearchParams();
    if (options.rev) params.append('rev', options.rev);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/databases/${encodeURIComponent(db)}/docs/${encodeURIComponent(id)}${qs}`);
  },

  createDocument: (db, doc) =>
    request(`/databases/${encodeURIComponent(db)}/docs`, {
      method: 'POST',
      body: JSON.stringify(doc),
    }),

  updateDocument: (db, id, doc) =>
    request(`/databases/${encodeURIComponent(db)}/docs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    }),

  deleteDocument: (db, id, rev) =>
    request(`/databases/${encodeURIComponent(db)}/docs/${encodeURIComponent(id)}?rev=${encodeURIComponent(rev)}`, {
      method: 'DELETE',
    }),

  // Indexes
  listIndexes: (db) => request(`/databases/${encodeURIComponent(db)}/indexes`),
  createIndex: (db, payload) =>
    request(`/databases/${encodeURIComponent(db)}/indexes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteIndex: (db, ddoc, name) =>
    request(`/databases/${encodeURIComponent(db)}/indexes/${encodeURIComponent(ddoc)}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),

  // Bulk operations
  bulkDocs: (db, docs) =>
    request(`/databases/${encodeURIComponent(db)}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ docs }),
    }),
};
