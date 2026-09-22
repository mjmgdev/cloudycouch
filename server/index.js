import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import CloudantClient from './cloudantClient.js';
import { mockDatabases } from './mockData.js';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Dev mode determination: env vars are ONLY used if running in dev mode
const isDev = process.env.NODE_ENV !== 'production';
const hasEnvCredentials = Boolean(
  process.env.CLOUDANT_URL &&
  (process.env.CLOUDANT_APIKEY || (process.env.CLOUDANT_USERNAME && process.env.CLOUDANT_PASSWORD))
);

// In-memory mock store for demo mode
let demoDatabases = JSON.parse(JSON.stringify(mockDatabases));
let forceDemoMode = false;

// Initialize client: ONLY use .env if running in dev mode AND credentials exist
let client = (isDev && hasEnvCredentials)
  ? new CloudantClient({ useEnv: true })
  : new CloudantClient({ url: '', apiKey: '', username: '', password: '' });

// Helper to determine if we should route to Mock/Demo
function shouldUseMock() {
  return forceDemoMode;
}

// Middleware: ensure client is connected before database operations
function checkConnected(req, res, next) {
  if (forceDemoMode || client.isConfigured()) {
    return next();
  }
  return res.status(401).json({ error: 'Not connected. Please connect to a Cloudant instance first.' });
}

/**
 * GET /api/status
 * Returns connection health and current mode
 */
app.get('/api/status', async (req, res) => {
  if (forceDemoMode) {
    return res.json({
      configured: false,
      demoMode: true,
      connected: true,
      latency: 5,
      isDev,
      envConfigured: isDev && hasEnvCredentials,
      version: 'Cloudant Mock Sandbox v2.4 (Simulated)',
      url: 'Interactive Demo Sandbox',
      authType: 'Sandbox',
    });
  }

  const isConfigured = client.isConfigured();

  if (!isConfigured) {
    return res.json({
      configured: false,
      demoMode: false,
      connected: false,
      isDev,
      envConfigured: isDev && hasEnvCredentials,
      version: null,
      url: null,
      authType: null,
    });
  }

  try {
    const status = await client.testConnection();
    res.json({
      configured: true,
      demoMode: false,
      connected: true,
      latency: status.latency,
      isDev,
      envConfigured: isDev && hasEnvCredentials,
      version: status.version || (status.info && (status.info.version || status.info.couchdb)) || 'Cloudant/CouchDB',
      url: maskUrl(client.url),
      authType: client.apiKey ? 'IBM IAM' : 'Basic Auth',
    });
  } catch (err) {
    res.json({
      configured: true,
      demoMode: false,
      connected: false,
      error: err.message,
      isDev,
      envConfigured: isDev && hasEnvCredentials,
      url: maskUrl(client.url),
      authType: client.apiKey ? 'IBM IAM' : 'Basic Auth',
    });
  }
});

function maskUrl(url) {
  if (!url) return 'Configured URL';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host.length > 22) {
      return `${parsed.protocol}//${host.slice(0, 8)}...${host.slice(-14)}`;
    }
    return `${parsed.protocol}//${host}`;
  } catch {
    return 'Configured URL';
  }
}

/**
 * POST /api/connect
 * Connect with URL and credentials
 */
app.post('/api/connect', async (req, res) => {
  const { url, authType = 'apikey', apiKey, username, password, useEnv } = req.body;

  let testClient;
  if (useEnv) {
    if (!isDev || !hasEnvCredentials) {
      return res.status(400).json({ error: '.env credentials are only available in development mode' });
    }
    testClient = new CloudantClient({ useEnv: true });
  } else {
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Cloudant/CouchDB instance URL is required' });
    }
    testClient = new CloudantClient({
      url: url.trim(),
      apiKey: authType === 'apikey' ? (apiKey || '').trim() : '',
      username: authType === 'basic' ? (username || '').trim() : '',
      password: authType === 'basic' ? (password || '') : '',
    });
  }

  try {
    const status = await testClient.testConnection();
    client = testClient;
    forceDemoMode = false;
    return res.json({
      success: true,
      connected: true,
      latency: status.latency,
      version: status.version || (status.info && (status.info.version || status.info.couchdb)) || 'Cloudant/CouchDB',
      url: maskUrl(client.url),
      authType: client.apiKey ? 'IBM IAM' : 'Basic Auth',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to connect to Cloudant instance',
    });
  }
});

/**
 * POST /api/test-connection
 * Test credentials without changing active connection
 */
app.post('/api/test-connection', async (req, res) => {
  const { url, authType = 'apikey', apiKey, username, password, useEnv } = req.body;

  let testClient;
  if (useEnv) {
    if (!isDev || !hasEnvCredentials) {
      return res.status(400).json({ error: '.env credentials are only available in development mode' });
    }
    testClient = new CloudantClient({ useEnv: true });
  } else {
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Cloudant/CouchDB instance URL is required' });
    }
    testClient = new CloudantClient({
      url: url.trim(),
      apiKey: authType === 'apikey' ? (apiKey || '').trim() : '',
      username: authType === 'basic' ? (username || '').trim() : '',
      password: authType === 'basic' ? (password || '') : '',
    });
  }

  try {
    const status = await testClient.testConnection();
    return res.json({
      success: true,
      latency: status.latency,
      version: status.version || (status.info && (status.info.version || status.info.couchdb)) || 'Cloudant/CouchDB',
      info: status.info,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Connection test failed',
    });
  }
});

/**
 * POST /api/disconnect
 * Clear active connection and disconnect
 */
app.post('/api/disconnect', (req, res) => {
  client = new CloudantClient({ url: '', apiKey: '', username: '', password: '' });
  forceDemoMode = false;
  return res.json({ success: true, connected: false });
});

/**
 * POST /api/connect-sandbox
 * Connect to offline demo sandbox
 */
app.post('/api/connect-sandbox', (req, res) => {
  client = new CloudantClient({ url: '', apiKey: '', username: '', password: '' });
  forceDemoMode = true;
  return res.json({
    success: true,
    demoMode: true,
    connected: true,
    version: 'Cloudant Mock Sandbox v2.4 (Simulated)',
  });
});

/**
 * POST /api/demo/toggle
 */
app.post('/api/demo/toggle', (req, res) => {
  const { enabled } = req.body;
  forceDemoMode = Boolean(enabled);
  res.json({ demoMode: forceDemoMode });
});

/**
 * POST /api/demo/reset
 */
app.post('/api/demo/reset', (req, res) => {
  demoDatabases = JSON.parse(JSON.stringify(mockDatabases));
  res.json({ success: true, message: 'Demo data reset successfully' });
});

// Protect all database endpoints: client must be connected or in demo mode
app.use('/api/databases', checkConnected);

/**
 * GET /api/databases
 * List databases with stats
 */
app.get('/api/databases', async (req, res) => {
  if (shouldUseMock()) {
    const list = demoDatabases.map(db => ({
      name: db.name,
      doc_count: db.docs.length,
      doc_del_count: db.doc_del_count || 0,
      disk_size: db.disk_size || (db.docs.length * 1024),
      partitioned: Boolean(db.partitioned),
    }));
    return res.json(list);
  }

  try {
    const dbNames = await client.listDatabases();
    // Filter out internal CouchDB dbs like _users, _replicator if desired or include them
    const statsPromises = dbNames.map(async (name) => {
      try {
        const info = await client.getDatabaseInfo(name);
        return {
          name,
          doc_count: info.doc_count,
          doc_del_count: info.doc_del_count,
          disk_size: info.sizes ? info.sizes.file : info.disk_size,
          partitioned: Boolean(info.props && info.props.partitioned),
        };
      } catch {
        return { name, doc_count: '—', disk_size: '—', partitioned: false };
      }
    });

    const results = await Promise.all(statsPromises);
    res.json(results);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/databases
 * Create a new database
 */
app.post('/api/databases', async (req, res) => {
  const { name, partitioned } = req.body;
  if (!name) return res.status(400).json({ error: 'Database name is required' });

  if (shouldUseMock()) {
    if (demoDatabases.find(d => d.name === name)) {
      return res.status(412).json({ error: 'Database already exists' });
    }
    const newDb = {
      name,
      doc_count: 0,
      doc_del_count: 0,
      disk_size: 4096,
      partitioned: Boolean(partitioned),
      indexes: [],
      docs: [],
    };
    demoDatabases.push(newDb);
    return res.json({ ok: true, name });
  }

  try {
    const result = await client.createDatabase(name, { partitioned });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /api/databases/:db
 */
app.delete('/api/databases/:db', async (req, res) => {
  const { db } = req.params;

  if (shouldUseMock()) {
    const idx = demoDatabases.findIndex(d => d.name === db);
    if (idx === -1) return res.status(404).json({ error: 'Database not found' });
    demoDatabases.splice(idx, 1);
    return res.json({ ok: true });
  }

  try {
    const result = await client.deleteDatabase(db);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/databases/:db/info
 */
app.get('/api/databases/:db/info', async (req, res) => {
  const { db } = req.params;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });
    return res.json({
      db_name: target.name,
      doc_count: target.docs.length,
      doc_del_count: target.doc_del_count || 0,
      disk_size: target.disk_size,
      partitioned: Boolean(target.partitioned),
    });
  }

  try {
    const info = await client.getDatabaseInfo(db);
    res.json(info);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/databases/:db/docs
 * List documents with pagination
 */
app.get('/api/databases/:db/docs', async (req, res) => {
  const { db } = req.params;
  const limit = parseInt(req.query.limit || '25', 10);
  const skip = parseInt(req.query.skip || '0', 10);
  const partition = req.query.partition;
  const prefix = req.query.prefix;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    let filtered = target.docs;
    if (partition) {
      filtered = filtered.filter(doc => doc._id.startsWith(`${partition}:`));
    }
    if (prefix) {
      filtered = filtered.filter(doc => doc._id.startsWith(prefix));
    }

    const total_rows = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    const rows = paginated.map(doc => ({
      id: doc._id,
      key: doc._id,
      value: { rev: doc._rev },
      doc: doc,
    }));

    return res.json({
      total_rows,
      offset: skip,
      rows,
    });
  }

  try {
    const result = await client.getDocuments(db, {
      limit,
      skip,
      include_docs: true,
      partition,
      prefix,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/databases/:db/find
 * Mango query execution
 */
app.post('/api/databases/:db/find', async (req, res) => {
  const { db } = req.params;
  const query = req.body;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    let docs = [...target.docs];

    // Minimal Mango selector simulation for demo
    if (query.selector && Object.keys(query.selector).length > 0) {
      docs = docs.filter(doc => {
        for (const [key, condition] of Object.entries(query.selector)) {
          if (typeof condition === 'object' && condition !== null) {
            if ('$eq' in condition && doc[key] !== condition.$eq) return false;
            if ('$gt' in condition && !(doc[key] > condition.$gt)) return false;
            if ('$gte' in condition && !(doc[key] >= condition.$gte)) return false;
            if ('$lt' in condition && !(doc[key] < condition.$lt)) return false;
            if ('$lte' in condition && !(doc[key] <= condition.$lte)) return false;
            if ('$regex' in condition) {
              const rx = new RegExp(condition.$regex, 'i');
              if (!rx.test(String(doc[key] ?? ''))) return false;
            }
            if ('$in' in condition && Array.isArray(condition.$in)) {
              if (!condition.$in.includes(doc[key])) return false;
            }
          } else {
            if (doc[key] !== condition) return false;
          }
        }
        return true;
      });
    }

    const limit = query.limit || 25;
    const skip = query.skip || 0;
    const paginated = docs.slice(skip, skip + limit);

    return res.json({
      docs: paginated,
      bookmark: 'mock-bookmark-token',
      execution_stats: {
        total_keys_examined: 0,
        total_docs_examined: target.docs.length,
        results_returned: paginated.length,
        execution_time_ms: 2.1,
      },
    });
  }

  try {
    const result = await client.findDocuments(db, query);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/databases/:db/docs/:id
 */
app.get('/api/databases/:db/docs/:id', async (req, res) => {
  const { db, id } = req.params;
  const { rev } = req.query;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });
    const doc = target.docs.find(d => d._id === id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const revsInfo = doc._revs_info || [
      { rev: doc._rev || '2-mockdemohead9a8b7c6d5e4f3a2b', status: 'available' },
      { rev: '1-mockdemoorigin0123456789abcdef', status: 'available' },
    ];
    return res.json({
      ...doc,
      _revs_info: revsInfo,
    });
  }

  try {
    const options = { revs_info: true };
    if (rev) options.rev = rev;
    const doc = await client.getDocument(db, id, options);
    res.json(doc);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/databases/:db/docs
 * Create document
 */
app.post('/api/databases/:db/docs', async (req, res) => {
  const { db } = req.params;
  const doc = req.body;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    const newDoc = {
      ...doc,
      _id: doc._id || `doc_${crypto.randomUUID().slice(0, 8)}`,
      _rev: '1-' + crypto.randomBytes(8).toString('hex'),
    };

    if (target.docs.find(d => d._id === newDoc._id)) {
      return res.status(409).json({ error: 'Document with this ID already exists' });
    }

    target.docs.unshift(newDoc);
    return res.json({ ok: true, id: newDoc._id, rev: newDoc._rev });
  }

  try {
    const result = await client.createDocument(db, doc);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PUT /api/databases/:db/docs/:id
 * Update document
 */
app.put('/api/databases/:db/docs/:id', async (req, res) => {
  const { db, id } = req.params;
  const doc = req.body;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    const docIndex = target.docs.findIndex(d => d._id === id);
    if (docIndex === -1) return res.status(404).json({ error: 'Document not found' });

    const prevDoc = target.docs[docIndex];
    if (doc._rev && prevDoc._rev && doc._rev !== prevDoc._rev) {
      return res.status(409).json({
        error: 'Document update conflict. The revision provided does not match the current revision.',
      });
    }

    const revNum = parseInt((prevDoc._rev || '0-').split('-')[0], 10) + 1;
    const newRev = `${revNum}-${crypto.randomBytes(8).toString('hex')}`;

    const updated = {
      ...doc,
      _id: id,
      _rev: newRev,
    };

    target.docs[docIndex] = updated;
    return res.json({ ok: true, id, rev: newRev });
  }

  try {
    const result = await client.updateDocument(db, id, doc);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /api/databases/:db/docs/:id
 */
app.delete('/api/databases/:db/docs/:id', async (req, res) => {
  const { db, id } = req.params;
  const rev = req.query.rev;

  if (!rev) {
    return res.status(400).json({ error: 'Document revision (_rev) query param is required' });
  }

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    const docIndex = target.docs.findIndex(d => d._id === id);
    if (docIndex === -1) return res.status(404).json({ error: 'Document not found' });

    const prevDoc = target.docs[docIndex];
    if (prevDoc._rev && prevDoc._rev !== rev) {
      return res.status(409).json({ error: 'Revision mismatch / document conflict' });
    }

    target.docs.splice(docIndex, 1);
    target.doc_del_count = (target.doc_del_count || 0) + 1;
    return res.json({ ok: true, id, rev: 'deleted' });
  }

  try {
    const result = await client.deleteDocument(db, id, rev);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/databases/:db/indexes
 */
app.get('/api/databases/:db/indexes', async (req, res) => {
  const { db } = req.params;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });
    const allIndexes = [
      { ddoc: null, name: '_all_docs', type: 'special', def: { fields: [{ _id: 'asc' }] } },
      ...(target.indexes || []).map(idx => ({
        ddoc: idx.ddoc,
        name: idx.name,
        type: 'json',
        def: idx.def,
      })),
    ];
    return res.json({ indexes: allIndexes, total_rows: allIndexes.length });
  }

  try {
    const result = await client.listIndexes(db);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/databases/:db/indexes
 */
app.post('/api/databases/:db/indexes', async (req, res) => {
  const { db } = req.params;
  const indexPayload = req.body;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });
    if (!target.indexes) target.indexes = [];

    const newIdx = {
      ddoc: indexPayload.ddoc || `_design/${indexPayload.name || 'idx'}-design`,
      name: indexPayload.name || `index_${Date.now()}`,
      def: indexPayload.index || { fields: ['_id'] },
    };
    target.indexes.push(newIdx);
    return res.json({ result: 'created', id: newIdx.ddoc, name: newIdx.name });
  }

  try {
    const result = await client.createIndex(db, indexPayload);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /api/databases/:db/indexes/:ddoc/:name
 */
app.delete('/api/databases/:db/indexes/:ddoc/:name', async (req, res) => {
  const { db, ddoc, name } = req.params;

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });
    if (target.indexes) {
      target.indexes = target.indexes.filter(idx => idx.name !== name);
    }
    return res.json({ ok: true });
  }

  try {
    const result = await client.deleteIndex(db, ddoc, name);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/databases/:db/bulk
 */
app.post('/api/databases/:db/bulk', async (req, res) => {
  const { db } = req.params;
  const { docs } = req.body;

  if (!Array.isArray(docs)) {
    return res.status(400).json({ error: 'Docs must be an array' });
  }

  if (shouldUseMock()) {
    const target = demoDatabases.find(d => d.name === db);
    if (!target) return res.status(404).json({ error: 'Database not found' });

    const results = docs.map(doc => {
      if (doc._deleted) {
        const idx = target.docs.findIndex(d => d._id === doc._id);
        if (idx !== -1) target.docs.splice(idx, 1);
        return { ok: true, id: doc._id, rev: 'deleted' };
      }

      const existingIdx = target.docs.findIndex(d => d._id === doc._id);
      const newRev = '1-' + crypto.randomBytes(8).toString('hex');
      const savedDoc = {
        ...doc,
        _id: doc._id || `doc_${crypto.randomUUID().slice(0, 8)}`,
        _rev: newRev,
      };

      if (existingIdx !== -1) {
        target.docs[existingIdx] = savedDoc;
      } else {
        target.docs.unshift(savedDoc);
      }
      return { ok: true, id: savedDoc._id, rev: savedDoc._rev };
    });

    return res.json(results);
  }

  try {
    const result = await client.bulkDocs(db, docs);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`CloudyCouch Studio backend running at http://localhost:${port}`);
  if (client.isConfigured()) {
    console.log(`Configured with Cloudant URL: ${client.url}`);
  } else {
    console.log(`No live credentials found in .env. Initialized with Interactive Demo Sandbox.`);
  }
});
