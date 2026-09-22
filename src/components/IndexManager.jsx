import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Database,
  Layers,
} from 'lucide-react';
import { api } from '../api/cloudantApi';

export default function IndexManager({ selectedDb, onNotify }) {
  const [indexes, setIndexes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // New index form state
  const [indexName, setIndexName] = useState('');
  const [indexFields, setIndexFields] = useState('');
  const [ddocName, setDdocName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchIndexes = async () => {
    if (!selectedDb) return;
    setIsLoading(true);
    try {
      const data = await api.listIndexes(selectedDb);
      setIndexes(data.indexes || []);
    } catch (err) {
      onNotify('error', `Failed to load indexes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndexes();
  }, [selectedDb]);

  const handleCreateIndex = async (e) => {
    e.preventDefault();
    if (!indexFields.trim()) {
      onNotify('error', 'Please specify at least one field to index');
      return;
    }

    const fieldsArray = indexFields
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsCreating(true);
    try {
      const payload = {
        index: { fields: fieldsArray },
        name: indexName.trim() || undefined,
        ddoc: ddocName.trim() || undefined,
        type: 'json',
      };

      await api.createIndex(selectedDb, payload);
      onNotify('success', `Index "${indexName || 'new index'}" created successfully`);
      setIndexName('');
      setIndexFields('');
      setDdocName('');
      setShowCreate(false);
      fetchIndexes();
    } catch (err) {
      onNotify('error', `Failed to create index: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteIndex = async (ddoc, name) => {
    if (!confirm(`Are you sure you want to delete index "${name}"?`)) return;

    try {
      await api.deleteIndex(selectedDb, ddoc, name);
      onNotify('success', `Index "${name}" deleted`);
      fetchIndexes();
    } catch (err) {
      onNotify('error', `Failed to delete index: ${err.message}`);
    }
  };

  return (
    <div className="table-card" style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ListFilter size={20} color="#38bdf8" />
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Mango Secondary Indexes</h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Indexes optimize Cloudant <code>_find</code> queries and speed up complex document searches.
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={14} />
          <span>{showCreate ? 'Cancel' : 'Create Index'}</span>
        </button>
      </div>

      {/* Create Index Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateIndex}
          style={{
            background: 'var(--bg-primary)',
            padding: '18px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h4 style={{ fontSize: '0.9rem', color: '#38bdf8' }}>New Mango Index</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Index Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. by-category"
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Indexed Fields (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. category, price"
                value={indexFields}
                onChange={(e) => setIndexFields(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Design Doc (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. custom-ddoc"
                value={ddocName}
                onChange={(e) => setDdocName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isCreating}
            >
              {isCreating ? 'Creating Index...' : 'Build Index'}
            </button>
          </div>
        </form>
      )}

      {/* Index Table */}
      {isLoading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
          Loading database indexes...
        </div>
      ) : indexes.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          No custom indexes defined for this database.
        </div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Index Name</th>
              <th>Type</th>
              <th>Design Document (ddoc)</th>
              <th>Indexed Fields</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((idx, index) => {
              const isSpecial = idx.type === 'special';
              const fields = idx.def?.fields
                ? idx.def.fields
                    .map((f) => (typeof f === 'string' ? f : Object.keys(f)[0]))
                    .join(', ')
                : '—';

              return (
                <tr key={`${idx.name}-${index}`}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {idx.name}
                  </td>
                  <td>
                    <span
                      className={`type-tag ${isSpecial ? 'boolean' : 'string'}`}
                    >
                      {idx.type}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {idx.ddoc || 'built-in'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {fields}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {!isSpecial && idx.ddoc && (
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Delete Index"
                          onClick={() => handleDeleteIndex(idx.ddoc, idx.name)}
                          style={{ padding: '4px' }}
                        >
                          <Trash2 size={14} color="#f43f5e" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
