/**
 * IBM Cloudant REST & IAM Client
 * Supports IBM Cloud IAM Token exchange with automatic caching and Basic Authentication fallback.
 */

class CloudantClient {
  constructor(config = {}) {
    if (config.useEnv) {
      this.url = (process.env.CLOUDANT_URL || '').replace(/\/+$/, '');
      this.apiKey = process.env.CLOUDANT_APIKEY || '';
      this.username = process.env.CLOUDANT_USERNAME || '';
      this.password = process.env.CLOUDANT_PASSWORD || '';
    } else {
      this.url = (config.url || '').replace(/\/+$/, '');
      this.apiKey = config.apiKey || '';
      this.username = config.username || '';
      this.password = config.password || '';
    }

    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  isConfigured() {
    return Boolean(this.url && (this.apiKey || (this.username && this.password)));
  }

  /**
   * Acquire or reuse IAM Bearer Token
   */
  async getIamToken() {
    const now = Math.floor(Date.now() / 1000);
    // Buffer by 60 seconds
    if (this.cachedToken && this.tokenExpiresAt > now + 60) {
      return this.cachedToken;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
    params.append('apikey', this.apiKey);

    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`IBM IAM Token exchange failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = data.expiration || (now + (data.expires_in || 3600));
    return this.cachedToken;
  }

  /**
   * Compute headers based on configured authentication scheme
   */
  async getHeaders(customHeaders = {}) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.apiKey) {
      const token = await this.getIamToken();
      headers['Authorization'] = `Bearer ${token}`;
    } else if (this.username && this.password) {
      const basic = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    return headers;
  }

  async request(path, options = {}) {
    if (!this.url) {
      throw new Error('CLOUDANT_URL is not configured in .env');
    }

    const url = `${this.url}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getHeaders(options.headers);

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
      const message = (data && data.reason) || (data && data.error) || (typeof data === 'string' ? data : response.statusText);
      const err = new Error(message || `Request failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /**
   * Ping & connection test
   */
  async testConnection() {
    const startTime = Date.now();
    const info = await this.request('/');
    const latency = Date.now() - startTime;
    return {
      connected: true,
      latency,
      url: this.url,
      info,
    };
  }

  /**
   * List all databases
   */
  async listDatabases() {
    return await this.request('/_all_dbs');
  }

  /**
   * Get database information (doc count, disk size, etc)
   */
  async getDatabaseInfo(dbName) {
    return await this.request(`/${encodeURIComponent(dbName)}`);
  }

  /**
   * Create database
   */
  async createDatabase(dbName, { partitioned = false } = {}) {
    const query = partitioned ? '?partitioned=true' : '';
    return await this.request(`/${encodeURIComponent(dbName)}${query}`, {
      method: 'PUT',
    });
  }

  /**
   * Delete database
   */
  async deleteDatabase(dbName) {
    // IMPORTANT: DO NOT IMPLEMENT THIS METHOD. 
    // It is not used in the current application and 
    // should be implemented with proper security measures.
    // For now just return and dont throw
    console.warn(`Delete database is disabled for security reasons. Cannot delete ${dbName}`);
    return { message: 'This operation is disabled for security reasons' };
  }

  /**
   * Get documents from database (_all_docs or partitioned)
   */
  async getDocuments(dbName, options = {}) {
    const {
      limit = 25,
      skip = 0,
      include_docs = true,
      descending = false,
      startkey,
      endkey,
      partition,
      prefix,
    } = options;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (skip > 0) params.append('skip', String(skip));
    params.append('include_docs', String(include_docs));
    if (descending) params.append('descending', 'true');

    if (prefix) {
      params.append('startkey', JSON.stringify(prefix));
      params.append('endkey', JSON.stringify(`${prefix}\ufff0`));
    } else {
      if (startkey !== undefined) params.append('startkey', JSON.stringify(startkey));
      if (endkey !== undefined) params.append('endkey', JSON.stringify(endkey));
    }

    const basePath = partition
      ? `/${encodeURIComponent(dbName)}/_partition/${encodeURIComponent(partition)}/_all_docs`
      : `/${encodeURIComponent(dbName)}/_all_docs`;

    return await this.request(`${basePath}?${params.toString()}`);
  }

  /**
   * Execute Mango Query (_find)
   */
  async findDocuments(dbName, query = {}) {
    return await this.request(`/${encodeURIComponent(dbName)}/_find`, {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  /**
   * Get single document
   */
  async getDocument(dbName, docId, options = {}) {
    const params = new URLSearchParams();
    if (options.rev) params.append('rev', options.rev);
    if (options.revs_info) params.append('revs_info', 'true');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}${queryStr}`);
  }

  /**
   * Create document
   */
  async createDocument(dbName, doc) {
    if (doc._id) {
      return await this.request(`/${encodeURIComponent(dbName)}/${encodeURIComponent(doc._id)}`, {
        method: 'PUT',
        body: JSON.stringify(doc),
      });
    }

    return await this.request(`/${encodeURIComponent(dbName)}`, {
      method: 'POST',
      body: JSON.stringify(doc),
    });
  }

  /**
   * Update document
   */
  async updateDocument(dbName, docId, doc) {
    return await this.request(`/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(dbName, docId, rev) {
    if (!rev) {
      throw new Error('Document revision (_rev) is required to delete a document');
    }
    return await this.request(
      `/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}?rev=${encodeURIComponent(rev)}`,
      { method: 'DELETE' }
    );
  }

  /**
   * List indexes
   */
  async listIndexes(dbName) {
    return await this.request(`/${encodeURIComponent(dbName)}/_index`);
  }

  /**
   * Create index
   */
  async createIndex(dbName, indexPayload) {
    return await this.request(`/${encodeURIComponent(dbName)}/_index`, {
      method: 'POST',
      body: JSON.stringify(indexPayload),
    });
  }

  /**
   * Delete index
   */
  async deleteIndex(dbName, ddoc, name) {
    return await this.request(
      `/${encodeURIComponent(dbName)}/_index/${encodeURIComponent(ddoc)}/json/${encodeURIComponent(name)}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Bulk operations
   */
  async bulkDocs(dbName, docs) {
    return await this.request(`/${encodeURIComponent(dbName)}/_bulk_docs`, {
      method: 'POST',
      body: JSON.stringify({ docs }),
    });
  }
}

export default CloudantClient;
