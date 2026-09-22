import React, { useState, useEffect, useRef } from 'react';
import { Database, Search, Eye, X } from 'lucide-react';
import { matchWildcard } from '../utils/helpers';
import { useModalEscape } from '../utils/modalStack';

export default function PeekContextMenu({
  isOpen,
  position = { x: 0, y: 0 },
  selectedText = '',
  databases = [],
  currentDb = '',
  onSelectDb,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const menuRef = useRef(null);

  useModalEscape({
    isOpen: Boolean(isOpen && selectedText),
    onEscape: onClose,
    zIndex: 9999,
    id: 'peek-context-menu',
  });

  useEffect(() => {
    setSearch('');
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !selectedText) return null;

  const filteredDbs = databases.filter((db) =>
    matchWildcard(db.name, search)
  );

  // Position adjusted to prevent overflowing screen edges
  const style = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 340),
    left: Math.min(position.x, window.innerWidth - 280),
    zIndex: 9999,
  };

  return (
    <div className="peek-context-menu" ref={menuRef} style={style}>
      <div className="peek-context-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={13} color="var(--accent-cyan)" />
          <span>Peek Document: <strong>"{selectedText.length > 20 ? selectedText.slice(0, 18) + '...' : selectedText}"</strong></span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
        >
          <X size={12} />
        </button>
      </div>

      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="search-input-wrap" style={{ width: '100%' }}>
          <Search size={12} className="search-icon" />
          <input
            type="text"
            className="search-input"
            style={{ fontSize: '0.75rem', padding: '4px 8px 4px 26px', width: '100%' }}
            placeholder="Filter DB (e.g. bb*2026*)..."
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="peek-context-list">
        <div style={{ padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Choose Database:
        </div>
        {filteredDbs.map((db) => {
          const isCurrent = db.name === currentDb;
          return (
            <button
              key={db.name}
              className={`peek-context-item ${isCurrent ? 'is-current' : ''}`}
              onClick={() => {
                onSelectDb(db.name, selectedText);
                onClose();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={12} color={isCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{db.name}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {db.doc_count !== undefined ? `${db.doc_count}` : ''}
              </span>
            </button>
          );
        })}
        {filteredDbs.length === 0 && (
          <div style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            No databases match "{search}"
          </div>
        )}
      </div>

      <div className="peek-context-footer">
        <span>Shortcut: Alt+P</span>
      </div>
    </div>
  );
}
