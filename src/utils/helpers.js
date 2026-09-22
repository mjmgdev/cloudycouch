/**
 * Utility helpers for CloudyCouch Studio
 */

export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Extract common column names from a list of documents for dynamic table display
 */
export function extractTopColumns(docs = [], maxCols = 5) {
  const counts = {};

  docs.forEach((doc) => {
    if (!doc || typeof doc !== 'object') return;
    Object.keys(doc).forEach((key) => {
      // Skip CouchDB metadata fields since we already display them
      if (key === '_id' || key === '_rev' || key.startsWith('_')) return;
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCols)
    .map(([key]) => key);
}

/**
 * Extract all unique column names and their frequencies from a list of documents
 */
export function extractAllAvailableColumns(docs = []) {
  const counts = {};
  docs.forEach((doc) => {
    if (!doc || typeof doc !== 'object') return;
    Object.keys(doc).forEach((key) => {
      if (key === '_id' || key === '_rev' || key.startsWith('_')) return;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

/**
 * Render a value preview cleanly with type detection
 */
export function renderValuePreview(val) {
  if (val === null) return { text: 'null', type: 'null' };
  if (val === undefined) return { text: 'undefined', type: 'undefined' };
  if (typeof val === 'boolean') return { text: val ? 'true' : 'false', type: 'boolean' };
  if (typeof val === 'number') return { text: String(val), type: 'number' };
  if (typeof val === 'string') return { text: val, type: 'string' };
  if (Array.isArray(val)) return { text: `[${val.length} items]`, type: 'array' };
  if (typeof val === 'object') return { text: `{${Object.keys(val).length} keys}`, type: 'object' };
  return { text: String(val), type: typeof val };
}

/**
 * Validate JSON with human-friendly error location
 */
export function validateJson(str) {
  try {
    const parsed = JSON.parse(str);
    return { valid: true, data: parsed, error: null };
  } catch (err) {
    return { valid: false, data: null, error: err.message };
  }
}

/**
 * Generate starter document templates
 */
export const DOC_TEMPLATES = {
  basic: {
    _id: `item_${Math.floor(Math.random() * 10000)}`,
    title: 'Sample Document',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  ecommerce: {
    _id: `prod_${Math.floor(Math.random() * 10000)}`,
    name: 'New Product',
    category: 'Electronics',
    price: 99.99,
    in_stock: true,
    tags: ['new', 'featured'],
    specs: {
      color: 'Midnight Blue',
      weight_kg: 0.45,
    },
    created_at: new Date().toISOString(),
  },
  user: {
    _id: `user_${Math.floor(Math.random() * 10000)}`,
    email: 'alex@example.com',
    full_name: 'Alex Doe',
    role: 'member',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
    created_at: new Date().toISOString(),
  },
};

/**
 * Download content as file
 */
export function downloadFile(content, fileName, contentType = 'application/json') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clean and extract a document ID from user selection or text snippet
 */
export function cleanDocId(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  // Strip quotes (single, double, backticks)
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '').trim();
  // Strip trailing punctuation often copied in JSON (comma, colon, semicolon)
  cleaned = cleaned.replace(/[,;:]$/, '').trim();
  return cleaned;
}

/**
 * Match a string against a search pattern supporting wildcards (*)
 * e.g. "bb*2026*" matches any db starting with "bb", containing "2026", ending with anything.
 * If no asterisk is typed, defaults to case-insensitive substring matching.
 */
export function matchWildcard(str, pattern) {
  if (!pattern || pattern.trim() === '') return true;
  if (!str) return false;
  const p = pattern.trim();
  if (!p.includes('*') && !p.includes('?')) {
    return str.toLowerCase().includes(p.toLowerCase());
  }
  // Escape regex special chars except '*' and '?'
  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  try {
    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(str);
  } catch {
    return str.toLowerCase().includes(p.replace(/[*?]/g, '').toLowerCase());
  }
}

/**
 * Truncate a string in the middle with an ellipsis (...) if it exceeds maxLength.
 * Preserves the beginning and ending characters so unique prefixes and suffixes remain visible.
 */
export function truncateMiddle(str, maxLength = 24) {
  if (!str || typeof str !== 'string' || str.length <= maxLength) return str || '';
  const charsToShow = maxLength - 3; // reserve 3 chars for "..."
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return `${str.slice(0, frontChars)}...${str.slice(-backChars)}`;
}


