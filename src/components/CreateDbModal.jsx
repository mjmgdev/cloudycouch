import React, { useState } from 'react';
import { Database, X, Layers, AlertCircle } from 'lucide-react';
import { useModalEscape } from '../utils/modalStack';

export default function CreateDbModal({ isOpen, onClose, onCreate }) {
  useModalEscape({
    isOpen,
    onEscape: onClose,
    zIndex: 60,
    id: 'create-db-modal',
  });

  if (!isOpen) return null;

  const [dbName, setDbName] = useState('');
  const [partitioned, setPartitioned] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = dbName.trim().toLowerCase();

    // Validate CouchDB naming rules
    const isValid = /^[a-z][a-z0-9_$()+/-]*$/.test(cleanName);
    if (!isValid) {
      setError(
        'Database name must start with a lowercase letter and contain only lowercase letters (a-z), numbers (0-9), and _$()+/-'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate(cleanName, partitioned);
      setDbName('');
      setPartitioned(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create database');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#38bdf8" />
            <span>Create New Database</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="editor-error-banner">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Database Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. store_orders"
                value={dbName}
                onChange={(e) => {
                  setDbName(e.target.value);
                  setError(null);
                }}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Only lowercase characters, digits, and special chars (_ $ ( ) + - /).
              </span>
            </div>

            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <input
                type="checkbox"
                id="partitioned-cb"
                checked={partitioned}
                onChange={(e) => setPartitioned(e.target.checked)}
                style={{ marginTop: '3px', accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <div>
                <label
                  htmlFor="partitioned-cb"
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Layers size={14} color="#a855f7" />
                  <span>Partitioned Database</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Enables partition keys (e.g. <code>user123:doc456</code>) for high-speed, query-bounded reads. Note: Partitioning cannot be disabled after creation.
                </p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !dbName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
