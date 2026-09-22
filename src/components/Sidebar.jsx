import React, { useState } from 'react';
import { Database, Plus, Search, Trash2, Layers, HardDrive, X, BarChart3, LogOut } from 'lucide-react';
import { formatBytes, truncateMiddle } from '../utils/helpers';

export default function Sidebar({
  databases = [],
  selectedDb,
  onSelectDb,
  onCreateDbClick,
  onDeleteDb,
  isOpen = true,
  isMobile = false,
  onCloseMobile,
  currentView = 'explorer',
  onViewChange,
  onDisconnect,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDbs = databases.filter((db) =>
    db.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDocs = databases.reduce((acc, db) => acc + (Number(db.doc_count) || 0), 0);

  return (
    <aside className={`app-sidebar ${isOpen ? (isMobile ? 'mobile-open' : '') : 'collapsed'}`}>
      {/* Sidebar View Navigation Switcher */}
      <div className="sidebar-nav-tabs">
        <button
          className={`sidebar-nav-tab ${currentView === 'explorer' ? 'active' : ''}`}
          onClick={() => {
            if (onViewChange) onViewChange('explorer');
          }}
          title="Database Document Explorer & Query Console"
        >
          <Database size={14} />
          <span>Explorer</span>
        </button>
        <button
          className={`sidebar-nav-tab ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => {
            if (onViewChange) onViewChange('analytics');
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          title="Database Storage, Sizing & Pattern Analytics"
        >
          <BarChart3 size={14} />
          <span>Analytics</span>
        </button>
      </div>

      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={15} color="var(--accent-cyan)" />
          <span className="sidebar-heading">Databases ({databases.length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onCreateDbClick}
            title="Create a new Cloudant database"
            style={{ padding: '4px 8px' }}
          >
            <Plus size={14} />
            <span>New DB</span>
          </button>
          {isMobile && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={onCloseMobile}
              title="Close sidebar"
              style={{ padding: '4px' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Database Search Filter */}
      <div className="sidebar-search">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search databases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Database List */}
      <ul className="db-list">
        {filteredDbs.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            {searchTerm ? 'No matching databases' : 'No databases found'}
          </div>
        ) : (
          filteredDbs.map((db) => {
            const isSelected = selectedDb === db.name;
            return (
              <li
                key={db.name}
                className={`db-item ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  onSelectDb(db.name);
                  if (onViewChange) onViewChange('explorer');
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
              >
                <div className="db-info">
                  {db.partitioned ? (
                    <Layers size={15} color="#c084fc" title="Partitioned database" />
                  ) : (
                    <Database size={15} color={isSelected ? '#38bdf8' : '#64748b'} />
                  )}
                  <span className="db-name" title={`${db.name} (${db.doc_count || 0})`}>
                    {truncateMiddle(db.name, 24)}
                  </span>
                </div>

                {/* <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="db-badge" title={`${db.doc_count} active documents`}>
                    {db.doc_count}
                  </span>
                </div> */}
              </li>
            );
          })
        )}
      </ul>

      {/* Sidebar Footer Stats & Disconnect */}
      <div
        className="sidebar-footer"
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.4)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={13} /> Total Docs:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {totalDocs.toLocaleString()}
          </span>
        </div>

        {onDisconnect && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDisconnect}
            title="Disconnect from instance"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              borderRadius: 0,
              paddingTop: '6px',
            }}
          >
            <LogOut size={12} color="#f43f5e" />
            <span>Disconnect Instance</span>
          </button>
        )}
      </div>
    </aside>
  );
}
