import React, { useState, useMemo, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import {
  Table as TableIcon,
  LayoutGrid,
  Code2,
  Plus,
  Trash2,
  Copy,
  Edit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Upload,
  Layers,
  FileJson,
  CheckSquare,
  Square,
  Search,
  SlidersHorizontal,
  ArrowLeftRight,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { extractTopColumns, extractAllAvailableColumns, renderValuePreview } from '../utils/helpers';

export default function DocumentTable({
  documents = [],
  totalRows = 0,
  page = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  selectedDb,
  isPartitioned = false,
  onNewDoc,
  onEditDoc,
  onDuplicateDoc,
  onDeleteDoc,
  onBulkDelete,
  onExportClick,
  onImportClick,
  activeFilter = null,
  onClearFilter,
  idPrefix = '',
  onClearPrefix,
  theme = 'dark',
  onPeek,
  onContextMenuPeek,
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'json'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [tableSearch, setTableSearch] = useState('');

  // Column customization states
  const [customCols, setCustomCols] = useState(() => {
    try {
      const saved = localStorage.getItem(`cloudant_cols_${selectedDb}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showColSelector, setShowColSelector] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [swapMenuCol, setSwapMenuCol] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const colSelectorRef = useRef(null);
  const swapMenuRef = useRef(null);

  // Sync custom cols when selectedDb changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cloudant_cols_${selectedDb}`);
      setCustomCols(saved ? JSON.parse(saved) : null);
    } catch {
      setCustomCols(null);
    }
    setSwapMenuCol(null);
    setShowColSelector(false);
  }, [selectedDb]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target)) {
        setShowColSelector(false);
      }
      if (swapMenuRef.current && !swapMenuRef.current.contains(e.target)) {
        setSwapMenuCol(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract documents array (handling both CouchDB _all_docs rows and Mango docs)
  const docsList = useMemo(() => {
    return documents.map((item) => item.doc || item);
  }, [documents]);

  // Client-side quick filter on ID or content
  const filteredDocs = useMemo(() => {
    if (!tableSearch.trim()) return docsList;
    const q = tableSearch.toLowerCase();
    return docsList.filter((doc) => {
      if (doc._id?.toLowerCase().includes(q)) return true;
      return JSON.stringify(doc).toLowerCase().includes(q);
    });
  }, [docsList, tableSearch]);

  // All unique available columns and their document count
  const allAvailableCols = useMemo(() => {
    return extractAllAvailableColumns(filteredDocs);
  }, [filteredDocs]);

  // Default dynamic top 5 columns
  const defaultCols = useMemo(() => {
    return extractTopColumns(filteredDocs, 5);
  }, [filteredDocs]);

  // Active columns to display in table
  const activeColumns = useMemo(() => {
    if (customCols && Array.isArray(customCols) && customCols.length > 0) {
      return customCols;
    }
    return defaultCols;
  }, [customCols, defaultCols]);

  // Save customized columns to state & localStorage
  const saveCustomCols = (cols) => {
    setCustomCols(cols);
    try {
      if (cols && cols.length > 0) {
        localStorage.setItem(`cloudant_cols_${selectedDb}`, JSON.stringify(cols));
      } else {
        localStorage.removeItem(`cloudant_cols_${selectedDb}`);
      }
    } catch (e) {
      console.error('Failed to save columns preference', e);
    }
  };

  // Toggle a column in the column picker
  const handleToggleColumn = (colKey) => {
    let nextCols;
    if (activeColumns.includes(colKey)) {
      if (activeColumns.length <= 1) return; // Keep at least one column
      nextCols = activeColumns.filter((c) => c !== colKey);
    } else {
      nextCols = [...activeColumns, colKey];
    }
    saveCustomCols(nextCols);
  };

  // Swap an active column with another column
  const handleSwapColumn = (oldCol, newCol) => {
    let nextCols = [...activeColumns];
    if (nextCols.includes(newCol)) {
      const idxOld = nextCols.indexOf(oldCol);
      const idxNew = nextCols.indexOf(newCol);
      nextCols[idxOld] = newCol;
      nextCols[idxNew] = oldCol;
    } else {
      nextCols = nextCols.map((c) => (c === oldCol ? newCol : c));
    }
    saveCustomCols(nextCols);
    setSwapMenuCol(null);
  };

  const handleResetColumns = () => {
    saveCustomCols(null);
    setColSearch('');
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((d) => d._id)));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const isAllSelected = filteredDocs.length > 0 && selectedIds.size === filteredDocs.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredDocs.length;

  return (
    <div>
      {/* Sub-Toolbar */}
      <div className="sub-toolbar">
        {/* Left: View Mode Toggle & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'json' ? 'active' : ''}`}
              onClick={() => setViewMode('json')}
              title="Individual JSON Cards View"
            >
              <Code2 size={14} />
              <span>JSON</span>
            </button>
          </div>

          <div className="search-input-wrap" style={{ width: '220px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter current view..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          {/* Column Selector Dropdown (visible in table mode) */}
          {viewMode === 'table' && (
            <div className="col-selector-container" ref={colSelectorRef}>
              <button
                className={`btn btn-secondary btn-sm ${showColSelector ? 'active' : ''}`}
                onClick={() => setShowColSelector(!showColSelector)}
                title="Customize visible columns"
              >
                <SlidersHorizontal size={13} />
                <span>Columns ({activeColumns.length})</span>
              </button>

              {showColSelector && (
                <div className="col-selector-panel">
                  <div className="col-selector-header">
                    <span>Display Columns</span>
                    <button
                      onClick={() => setShowColSelector(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="col-selector-search">
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px' }}
                      placeholder="Search fields..."
                      value={colSearch}
                      onChange={(e) => setColSearch(e.target.value)}
                    />
                  </div>

                  <div className="col-selector-list">
                    {allAvailableCols
                      .filter((c) => c.key.toLowerCase().includes(colSearch.toLowerCase()))
                      .map(({ key, count }) => {
                        const isSelected = activeColumns.includes(key);
                        return (
                          <div
                            key={key}
                            className={`col-selector-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleColumn(key)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                              />
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{key}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {count} {count === 1 ? 'doc' : 'docs'}
                            </span>
                          </div>
                        );
                      })}
                    {allAvailableCols.length === 0 && (
                      <div style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No custom fields found in current documents
                      </div>
                    )}
                  </div>

                  <div className="col-selector-footer">
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem' }}
                      onClick={handleResetColumns}
                      title="Reset to top 5 detected columns"
                    >
                      Reset Default
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {activeColumns.length} visible
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeFilter && (
            <div className="filter-pill-query">
              <span>Query Filter Active</span>
              <button
                onClick={onClearFilter}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'currentColor',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                &times;
              </button>
            </div>
          )}

          {idPrefix && (
            <div className="filter-pill-prefix">
              <span>ID Prefix: <code>{idPrefix}</code></span>
              <button
                onClick={onClearPrefix}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'currentColor',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedIds.size > 0 ? (
            <div className="selection-badge-wrap">
              <span className="selection-badge-count">
                {selectedIds.size} selected
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  onBulkDelete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onImportClick}
                title="Import JSON documents"
              >
                <Upload size={14} />
                <span>Import</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onExportClick}
                title="Export documents to JSON or CSV"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={onNewDoc}>
                <Plus size={14} />
                <span>New Document</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Documents Content */}
      {filteredDocs.length === 0 ? (
        <div className="table-card empty-state">
          <FileJson className="empty-state-icon" />
          <div className="empty-state-title">No documents found</div>
          <div className="empty-state-desc">
            {tableSearch
              ? 'No documents matched your local search.'
              : 'This database is empty. Create your first document or import sample data.'}
          </div>
          <button className="btn btn-primary btn-sm" onClick={onNewDoc} style={{ marginTop: '8px' }}>
            <Plus size={14} />
            <span>Create Document</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                    />
                  </th>
                  <th style={{ minWidth: '180px' }}>Document ID (_id)</th>
                  <th style={{ width: '130px' }}>Revision (_rev)</th>
                  {activeColumns.map((col) => (
                    <th key={col} className="col-header-cell">
                      <div className="col-header-content">
                        <span>{col}</span>
                        <button
                          className="col-swap-btn"
                          title={`Swap "${col}" with another field`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwapMenuCol(swapMenuCol === col ? null : col);
                          }}
                        >
                          <ArrowLeftRight size={11} />
                        </button>
                      </div>

                      {/* Column Swap Dropdown */}
                      {swapMenuCol === col && (
                        <div className="col-swap-menu" ref={swapMenuRef}>
                          <div className="col-swap-menu-title">
                            Swap "{col}" with:
                          </div>
                          {allAvailableCols
                            .filter((c) => c.key !== col)
                            .map(({ key, count }) => (
                              <button
                                key={key}
                                className="col-swap-option"
                                onClick={() => handleSwapColumn(col, key)}
                              >
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{key}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {activeColumns.includes(key) ? '(swap pos)' : `(${count})`}
                                </span>
                              </button>
                            ))}
                          {allAvailableCols.filter((c) => c.key !== col).length === 0 && (
                            <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              No other fields available
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                  <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const isSelected = selectedIds.has(doc._id);
                  return (
                    <tr
                      key={doc._id}
                      style={{
                        background: isSelected ? 'var(--accent-cyan-glow)' : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(doc._id)}
                          style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                        />
                      </td>
                      <td
                        className="id-cell"
                        onClick={() => onEditDoc(doc)}
                        style={{ cursor: 'pointer' }}
                        title={doc._id}
                      >
                        {doc._id}
                      </td>
                      <td className="rev-cell" title={doc._rev}>
                        {doc._rev ? doc._rev.slice(0, 5) + '...' : '—'}
                      </td>
                      {activeColumns.map((col) => {
                        const preview = renderValuePreview(doc[col]);
                        return (
                          <td key={col} title={typeof doc[col] === 'object' ? JSON.stringify(doc[col], null, 2) : String(doc[col])}>
                            <span className={`type-tag ${preview.type}`}>
                              {preview.text}
                            </span>
                          </td>
                        );
                      })}
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => onEditDoc(doc)}
                            title="Edit Document"
                            style={{ padding: '4px' }}
                          >
                            <Edit size={14} color="#38bdf8" />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => onDuplicateDoc(doc)}
                            title="Clone Document"
                            style={{ padding: '4px' }}
                          >
                            <Copy size={14} color="#94a3b8" />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => onDeleteDoc(doc._id, doc._rev)}
                            title="Delete Document"
                            style={{ padding: '4px' }}
                          >
                            <Trash2 size={14} color="#f43f5e" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <div>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalRows || filteredDocs.length)} of {totalRows || filteredDocs.length} documents
            </div>
            <div className="pagination-controls">
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Page size:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                className="btn btn-secondary btn-icon"
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                style={{ padding: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary btn-icon"
                disabled={(page + 1) * pageSize >= totalRows}
                onClick={() => onPageChange(page + 1)}
                style={{ padding: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="table-card">
          <div className="card-grid" style={{ padding: '16px' }}>
            {filteredDocs.map((doc) => (
              <div key={doc._id} className="doc-card">
                <div className="doc-card-header">
                  <div>
                    <div className="doc-card-id">{doc._id}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {doc._rev}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc._id)}
                    onChange={() => handleToggleSelect(doc._id)}
                    style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                </div>

                <div className="codemirror-wrapper json-card-cm" style={{ maxHeight: '160px', overflow: 'hidden' }}>
                  <CodeMirror
                    value={JSON.stringify(
                      Object.fromEntries(
                        Object.entries(doc).filter(([k]) => k !== '_id' && k !== '_rev')
                      ),
                      null,
                      2
                    )}
                    height="160px"
                    extensions={[json()]}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    readOnly={true}
                    editable={false}
                    basicSetup={{
                      lineNumbers: false,
                      foldGutter: true,
                      highlightActiveLine: false,
                    }}
                  />
                </div>

                <div className="doc-card-actions">
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {Object.keys(doc).length} fields
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onDuplicateDoc(doc)}
                      title="Clone"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditDoc(doc)}
                    >
                      <Edit size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteDoc(doc._id, doc._rev)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <div>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalRows || filteredDocs.length)} of {totalRows || filteredDocs.length} documents
            </div>
            <div className="pagination-controls">
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Page size:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                className="btn btn-secondary btn-icon"
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                style={{ padding: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary btn-icon"
                disabled={(page + 1) * pageSize >= totalRows}
                onClick={() => onPageChange(page + 1)}
                style={{ padding: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* INDIVIDUAL JSON CARDS VIEW */
        <div className="table-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{filteredDocs.length}</strong> documents in structured JSON view
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(filteredDocs, null, 2));
                setCopiedId('__all__');
                setTimeout(() => setCopiedId(null), 2000);
              }}
            >
              <Copy size={13} />
              <span>{copiedId === '__all__' ? 'Copied Full Array!' : 'Copy Full JSON Array'}</span>
            </button>
          </div>

          <div className="json-cards-list">
            {filteredDocs.map((doc) => {
              const isCopied = copiedId === doc._id;
              const isSelected = selectedIds.has(doc._id);
              return (
                <div key={doc._id} className="json-doc-card">
                  <div className="json-doc-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(doc._id)}
                        style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                      />
                      <span
                        className="json-doc-card-id"
                        onClick={() => onEditDoc(doc)}
                        title="Click to edit document"
                      >
                        {doc._id}
                      </span>
                      {doc._rev && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          rev: {doc._rev.slice(0, 8)}...
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {Object.keys(doc).length} fields
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const sel = window.getSelection()?.toString() || '';
                          onPeek && onPeek(sel || doc._id, selectedDb);
                        }}
                        title="Peek document (Alt+P or right-click selected text)"
                      >
                        <Eye size={13} color="var(--accent-cyan)" />
                        <span>Peek</span>
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                          setCopiedId(doc._id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        title="Copy this document's JSON"
                      >
                        <Copy size={13} />
                        <span>{isCopied ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => onDuplicateDoc(doc)}
                        title="Clone Document"
                        style={{ padding: '4px' }}
                      >
                        <Copy size={13} color="#94a3b8" />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => onEditDoc(doc)}
                        title="Edit Document"
                        style={{ padding: '4px' }}
                      >
                        <Edit size={13} color="#38bdf8" />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => onDeleteDoc(doc._id, doc._rev)}
                        title="Delete Document"
                        style={{ padding: '4px' }}
                      >
                        <Trash2 size={13} color="#f43f5e" />
                      </button>
                    </div>
                  </div>

                  <div
                    className="codemirror-wrapper json-card-cm"
                    onContextMenu={(e) => {
                      const sel = window.getSelection()?.toString() || '';
                      if (sel && onContextMenuPeek) {
                        onContextMenuPeek(e, sel, selectedDb);
                      }
                    }}
                  >
                    <CodeMirror
                      value={JSON.stringify(doc, null, 2)}
                      extensions={[json()]}
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      readOnly={true}
                      editable={false}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        highlightActiveLine: false,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <div>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalRows || filteredDocs.length)} of {totalRows || filteredDocs.length} documents
            </div>
            <div className="pagination-controls">
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Page size:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                className="btn btn-secondary btn-icon"
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                style={{ padding: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary btn-icon"
                disabled={(page + 1) * pageSize >= totalRows}
                onClick={() => onPageChange(page + 1)}
                style={{ padding: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

