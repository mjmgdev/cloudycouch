import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import {
  Eye,
  X,
  Search,
  Database,
  Copy,
  Edit,
  Save,
  Plus,
  AlertCircle,
  FileJson,
  Check,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  History,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api/cloudantApi';
import { matchWildcard, cleanDocId } from '../utils/helpers';
import { useModalEscape } from '../utils/modalStack';
import PeekContextMenu from './PeekContextMenu';

export default function PeekModal({
  isOpen,
  onClose,
  initialDocId = '',
  initialDb = '',
  peekRequest,
  databases = [],
  onOpenInEditor,
  onDocSaved,
  onNotify,
  theme = 'dark',
}) {
  // Tabs state: array of { id, docId, db, doc, editorText, isDirty, isLoading, error, rev, lastSaved }
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // DB Combobox state
  const [dbSearch, setDbSearch] = useState('');
  const [isDbOpen, setIsDbOpen] = useState(false);
  const dbComboboxRef = useRef(null);

  // Copied & Saving states
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
    }
  }, [isOpen]);

  // Local context menu state for peeking from CodeMirror selection
  const [peekContext, setPeekContext] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    selectedText: '',
  });

  // Helper to update a single tab's state
  const updateTab = useCallback((tabId, patch) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id !== tabId) return t;
        const resolved = typeof patch === 'function' ? patch(t) : patch;
        return { ...t, ...resolved };
      })
    );
  }, []);

  // Fetch document for a specific tab (supports targetRev for time-travel)
  const fetchDocForTab = useCallback(async (tabId, db, docId, targetRev = null) => {
    if (!db || !docId?.trim()) {
      updateTab(tabId, {
        doc: null,
        editorText: '',
        isLoading: false,
        error: null,
        rev: null,
        revsInfo: [],
        selectedRev: null,
        latestRev: null,
        isDirty: false,
      });
      return;
    }

    updateTab(tabId, { isLoading: true, error: null });

    try {
      const doc = await api.getDocument(db, docId.trim(), targetRev ? { rev: targetRev } : {});

      // Extract revs_info for time-travel, but remove from doc so it's not displayed in JSON view
      const revsInfo = doc._revs_info || [];
      const cleanDoc = { ...doc };
      delete cleanDoc._revs_info;

      const currentRev = cleanDoc._rev || null;

      updateTab(tabId, (existingTab) => {
        const latestRev = targetRev ? (existingTab?.latestRev || currentRev) : currentRev;
        const finalRevsInfo = revsInfo.length > 0 ? revsInfo : (existingTab?.revsInfo || []);
        return {
          doc: cleanDoc,
          editorText: JSON.stringify(cleanDoc, null, 2),
          isLoading: false,
          error: null,
          rev: currentRev,
          revsInfo: finalRevsInfo,
          selectedRev: currentRev,
          latestRev: latestRev,
          isDirty: false,
        };
      });
    } catch (err) {
      updateTab(tabId, {
        doc: null,
        editorText: '',
        isLoading: false,
        error: err.message || `Document "${docId}" was not found in database "${db}"`,
        rev: null,
        isDirty: false,
      });
    }
  }, [updateTab]);

  // Sync incoming peek requests from props
  useEffect(() => {
    if (!isOpen) return;

    const reqDocId = initialDocId?.trim() || '';
    const targetDb = initialDb || databases[0]?.name || '';

    // If modal is opened without an initialDocId and has no tabs, create an empty tab
    if (!reqDocId) {
      if (tabs.length === 0) {
        const newId = `tab-${Date.now()}`;
        const newTab = {
          id: newId,
          docId: '',
          db: targetDb,
          doc: null,
          editorText: '',
          isDirty: false,
          isLoading: false,
          error: null,
          rev: null,
          lastSaved: null,
        };
        setTabs([newTab]);
        setActiveTabId(newId);
      }
      return;
    }

    // If tab with same docId and db exists, activate it
    const existing = tabs.find((t) => t.docId === reqDocId && t.db === targetDb);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Otherwise create a new tab and fetch doc
    const newId = `${targetDb}:${reqDocId}-${Date.now()}`;
    const newTab = {
      id: newId,
      docId: reqDocId,
      db: targetDb,
      doc: null,
      editorText: '',
      isDirty: false,
      isLoading: true,
      error: null,
      rev: null,
      lastSaved: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    fetchDocForTab(newId, targetDb, reqDocId);
  }, [isOpen, initialDocId, initialDb, peekRequest, databases, fetchDocForTab]);

  // Active tab reference
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0] || null,
    [tabs, activeTabId]
  );

  const isHistorical = Boolean(
    activeTab?.selectedRev &&
    activeTab?.latestRev &&
    activeTab.selectedRev !== activeTab.latestRev
  );

  // Sync DB search input with active tab's DB when active tab changes
  useEffect(() => {
    if (activeTab?.db) {
      setDbSearch(activeTab.db);
    }
    setIsDbOpen(false);
  }, [activeTab?.id, activeTab?.db]);

  // Close DB dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dbComboboxRef.current && !dbComboboxRef.current.contains(e.target)) {
        setIsDbOpen(false);
        if (activeTab?.db) {
          setDbSearch(activeTab.db);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeTab]);

  // Close tab handler
  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    const filtered = tabs.filter((t) => t.id !== tabId);
    if (filtered.length === 0) {
      setTabs([]);
      setActiveTabId(null);
      onClose();
      return;
    }
    setTabs(filtered);
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      const nextTab = filtered[Math.max(0, idx - 1)];
      setActiveTabId(nextTab.id);
    }
  };

  // Add new blank tab handler
  const handleAddTab = () => {
    const currentDb = activeTab?.db || initialDb || databases[0]?.name || '';
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      docId: '',
      db: currentDb,
      doc: null,
      editorText: '',
      isDirty: false,
      isLoading: false,
      error: null,
      rev: null,
      lastSaved: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setDbSearch(currentDb);
  };

  // Filtered databases for combobox using wildcard search
  const filteredDatabases = useMemo(() => {
    if (!dbSearch || dbSearch.trim() === '') return databases;
    return databases.filter((db) => matchWildcard(db.name, dbSearch));
  }, [databases, dbSearch]);

  // DB selection handler
  const handleSelectDb = (dbName) => {
    if (!activeTab) return;
    updateTab(activeTab.id, { db: dbName });
    setDbSearch(dbName);
    setIsDbOpen(false);
    if (activeTab.docId?.trim()) {
      fetchDocForTab(activeTab.id, dbName, activeTab.docId.trim());
    }
  };

  // Doc ID change handler
  const handleDocIdChange = (newDocId) => {
    if (!activeTab) return;
    updateTab(activeTab.id, { docId: newDocId });
  };

  // Doc ID submit (press Enter)
  const handleDocIdSubmit = () => {
    if (!activeTab) return;
    fetchDocForTab(activeTab.id, activeTab.db, activeTab.docId);
  };

  // Copy JSON handler
  const handleCopy = () => {
    if (!activeTab?.editorText) return;
    navigator.clipboard.writeText(activeTab.editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format JSON handler
  const handleFormatJson = () => {
    if (!activeTab?.editorText) return;
    try {
      const parsed = JSON.parse(activeTab.editorText);
      const formatted = JSON.stringify(parsed, null, 2);
      updateTab(activeTab.id, { editorText: formatted });
      if (onNotify) onNotify('info', 'JSON formatted successfully');
    } catch (err) {
      if (onNotify) onNotify('error', `Cannot format JSON: ${err.message}`);
    }
  };

  // Time-travel to a specific revision
  const handleSelectRev = async (newRev) => {
    if (!activeTab || !activeTab.db || !activeTab.docId || !newRev) return;
    if (newRev === activeTab.selectedRev) return;
    await fetchDocForTab(activeTab.id, activeTab.db, activeTab.docId, newRev);
  };

  // Restore current historical revision as current draft
  const handleRestoreHistoricalAsLatest = () => {
    if (!activeTab || !activeTab.editorText) return;
    try {
      const parsed = JSON.parse(activeTab.editorText);
      delete parsed._revs_info;
      if (activeTab.latestRev) {
        parsed._rev = activeTab.latestRev;
      }
      const formatted = JSON.stringify(parsed, null, 2);
      updateTab(activeTab.id, {
        doc: parsed,
        editorText: formatted,
        rev: activeTab.latestRev,
        selectedRev: activeTab.latestRev,
        isDirty: true,
      });
      if (onNotify) {
        onNotify('info', `Historical content loaded as current draft. Click "Save Changes" to commit as new revision.`);
      }
    } catch (err) {
      if (onNotify) onNotify('error', `Cannot restore draft: ${err.message}`);
    }
  };

  // Save Document handler
  const handleSaveDocument = async () => {
    if (!activeTab || !activeTab.db) return;
    if (!activeTab.editorText?.trim()) {
      if (onNotify) onNotify('error', 'Document body cannot be empty');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(activeTab.editorText);
    } catch (err) {
      if (onNotify) onNotify('error', `Invalid JSON syntax: ${err.message}`);
      return;
    }

    const docIdToSave = parsed._id || activeTab.docId;
    if (!docIdToSave) {
      if (onNotify) onNotify('error', 'Document must have a valid _id');
      return;
    }

    // Strip read-only metadata fields like _revs_info
    delete parsed._revs_info;

    // If saving while viewing an older revision, commit against current head revision
    if (activeTab.latestRev && parsed._rev !== activeTab.latestRev) {
      parsed._rev = activeTab.latestRev;
    }

    setIsSaving(true);
    try {
      const res = await api.updateDocument(activeTab.db, docIdToSave, parsed);
      const updatedDoc = { ...parsed, _rev: res.rev };
      const formatted = JSON.stringify(updatedDoc, null, 2);

      updateTab(activeTab.id, {
        doc: updatedDoc,
        editorText: formatted,
        rev: res.rev,
        selectedRev: res.rev,
        latestRev: res.rev,
        isDirty: false,
        error: null,
        lastSaved: new Date().toLocaleTimeString(),
      });

      if (onNotify) {
        onNotify('success', `Saved document "${docIdToSave}" (rev ${res.rev.slice(0, 8)}...)`);
      }
      if (onDocSaved) {
        onDocSaved(activeTab.db, updatedDoc);
      }

      // Re-fetch to refresh revision history tree
      fetchDocForTab(activeTab.id, activeTab.db, docIdToSave);
    } catch (err) {
      if (onNotify) {
        onNotify('error', `Failed to save: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Open a document in a new tab from the context menu
  const handlePeekInNewTab = useCallback((docId, dbName) => {
    const reqDocId = cleanDocId(docId);
    const targetDb = dbName || activeTab?.db || databases[0]?.name || '';
    if (!reqDocId) return;

    setPeekContext((prev) => ({ ...prev, isOpen: false }));

    // If tab with same docId and db exists, activate it
    const existing = tabs.find((t) => t.docId === reqDocId && t.db === targetDb);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Otherwise create a new tab and fetch doc
    const newId = `${targetDb}:${reqDocId}-${Date.now()}`;
    const newTab = {
      id: newId,
      docId: reqDocId,
      db: targetDb,
      doc: null,
      editorText: '',
      isDirty: false,
      isLoading: true,
      error: null,
      rev: null,
      lastSaved: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    fetchDocForTab(newId, targetDb, reqDocId);
  }, [tabs, activeTab?.db, databases, fetchDocForTab]);

  // Escape key handling via modal stack (dismisses combobox/context menu first, then closes PeekModal)
  useModalEscape({
    isOpen,
    onEscape: () => {
      // If local context menu is open, dismiss it first
      if (peekContext.isOpen) {
        setPeekContext((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      // If target DB combobox is open, dismiss it first
      if (isDbOpen) {
        setIsDbOpen(false);
        return;
      }
      // Close modal
      onClose();
    },
    zIndex: 60,
    id: 'peek-modal',
  });

  // Alt+P / Alt+F12 inside PeekModal on selection
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'p') || (e.altKey && e.key === 'F12')) {
        const sel = window.getSelection()?.toString() || '';
        const cleaned = cleanDocId(sel);
        if (cleaned) {
          e.preventDefault();
          e.stopPropagation();
          setPeekContext({
            isOpen: true,
            position: {
              x: Math.max(20, Math.min(window.innerWidth / 2 - 140, window.innerWidth - 300)),
              y: Math.max(20, Math.min(window.innerHeight / 2 - 160, window.innerHeight - 350)),
            },
            selectedText: cleaned,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`modal-backdrop ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div
        className={`modal-panel peek-modal-panel ${isFullscreen ? 'is-fullscreen' : ''}`}
        style={
          isFullscreen
            ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0 }
            : { maxWidth: '860px', width: '92vw', maxHeight: '90vh' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{ padding: '14px 20px', borderBottom: 'none', userSelect: 'none' }}
          onDoubleClick={() => setIsFullscreen((prev) => !prev)}
          title="Double-click header to toggle fullscreen"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Peek Document</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  Workbench
                </span>
                {isFullscreen && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Fullscreen
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Inspect, edit and switch documents across databases without leaving your view
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Restore Down' : 'Maximize to Fullscreen'}
              aria-label={isFullscreen ? 'Restore Down' : 'Maximize to Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="peek-tabs-bar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const title = tab.docId || '(New Peek)';
            return (
              <div
                key={tab.id}
                className={`peek-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                title={`${tab.db}: ${title}`}
              >
                <FileJson size={13} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                <span className="peek-tab-title">{title}</span>
                {tab.isDirty && <span className="peek-tab-dirty-dot" title="Unsaved changes" />}
                <button
                  className="peek-tab-close-btn"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          <button className="peek-tab-new-btn" onClick={handleAddTab} title="Open new document tab">
            <Plus size={12} />
            <span>New Tab</span>
          </button>
        </div>

        {/* Controls Grid: Document ID & Searchable Target DB Combobox */}
        {activeTab && (
          <div
            style={{
              padding: '14px 20px',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="peek-controls-grid">
              {/* Document ID Input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Document ID (_id)</span>
                  {activeTab.rev && (
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      rev: {activeTab.rev.slice(0, 8)}...
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      width: '100%',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      paddingRight: activeTab.docId ? '32px' : '12px',
                    }}
                    placeholder="Type or paste document _id..."
                    value={activeTab.docId || ''}
                    onChange={(e) => handleDocIdChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDocIdSubmit();
                      }
                    }}
                  />
                  {activeTab.docId ? (
                    <button
                      onClick={() => handleDocIdChange('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Clear ID"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Target Database Searchable Combobox */}
              <div className="form-group" style={{ marginBottom: 0 }} ref={dbComboboxRef}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>
                  Target Database
                </label>
                <div className="peek-db-combobox">
                  <div className="peek-db-input-wrap">
                    <Database size={13} className="peek-db-input-icon" />
                    <input
                      type="text"
                      className="peek-db-input"
                      placeholder="Filter DB (e.g. bb*2026*)..."
                      value={dbSearch}
                      onChange={(e) => {
                        setDbSearch(e.target.value);
                        setIsDbOpen(true);
                      }}
                      onFocus={() => setIsDbOpen(true)}
                    />
                    <button
                      type="button"
                      className="peek-db-chevron"
                      onClick={() => setIsDbOpen((prev) => !prev)}
                      tabIndex={-1}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Dropdown Options List */}
                  {isDbOpen && (
                    <div className="peek-db-dropdown">
                      <div
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Wildcard match ({filteredDatabases.length}):
                      </div>
                      {filteredDatabases.map((db) => {
                        const isSelected = db.name === activeTab.db;
                        return (
                          <button
                            key={db.name}
                            type="button"
                            className={`peek-db-option ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleSelectDb(db.name)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Database
                                size={12}
                                color={isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                              />
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{db.name}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {db.doc_count !== undefined ? `${db.doc_count} docs` : ''}
                            </span>
                          </button>
                        );
                      })}
                      {filteredDatabases.length === 0 && (
                        <div
                          style={{
                            padding: '12px 8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                          }}
                        >
                          No database matching "{dbSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: Document Editor / Status */}
        <div
          className="modal-body"
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {activeTab?.isLoading ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 12px' }} />
              <div>Fetching document "{activeTab.docId}" from {activeTab.db}...</div>
            </div>
          ) : activeTab?.error ? (
            <div style={{ padding: '30px 20px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Document Not Found
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                  maxWidth: '440px',
                  margin: '4px auto 0',
                }}
              >
                {activeTab.error}
              </div>

              {/* <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Try looking for "{activeTab.docId}" in another database:
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {databases
                    .filter((db) => db.name !== activeTab.db)
                    .slice(0, 6)
                    .map((db) => (
                      <button
                        key={db.name}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectDb(db.name)}
                      >
                        <Database size={12} />
                        <span>{db.name}</span>
                      </button>
                    ))}
                </div>
              </div> */}
            </div>
          ) : activeTab?.doc || activeTab?.editorText ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flex: isFullscreen ? 1 : undefined,
                minHeight: 0,
              }}
            >
              {/* Toolbar above CodeMirror */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {activeTab.doc?._id || activeTab.docId}
                  </span>
                  {activeTab.isDirty ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                      }}
                    >
                      ● Modified
                    </span>
                  ) : activeTab.lastSaved ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                      }}
                    >
                      ✓ Saved ({activeTab.lastSaved})
                    </span>
                  ) : null}
                  {isHistorical && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Viewing an older historical revision"
                    >
                      <Clock size={11} /> Historical ({activeTab.selectedRev?.slice(0, 8)}...)
                    </span>
                  )}
                  {activeTab.doc && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {Object.keys(activeTab.doc).length} fields
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Revision Time Travel Dropdown - right next to Format JSON */}
                  {activeTab.revsInfo && activeTab.revsInfo.length > 0 && (
                    <div
                      className={`peek-rev-select-wrap ${isHistorical ? 'is-historical' : ''}`}
                      title="Browse and inspect document revisions"
                    >
                      <History size={13} className="peek-rev-icon" />
                      <select
                        className={`peek-rev-select ${isHistorical ? 'is-historical' : ''}`}
                        value={activeTab.selectedRev || activeTab.rev || ''}
                        onChange={(e) => handleSelectRev(e.target.value)}
                        disabled={activeTab.isLoading || isSaving}
                      >
                        {activeTab.revsInfo.map((item, idx) => {
                          const isLatest = idx === 0;
                          const isAvailable = item.status === 'available' || !item.status;
                          const shortRev = item.rev ? `${item.rev.slice(0, 8)}...` : item.rev;
                          const label = `${shortRev} ${isLatest ? '(latest)' : ''} ${!isAvailable ? `[${item.status}]` : ''}`.trim();
                          return (
                            <option key={item.rev} value={item.rev} disabled={!isAvailable}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleFormatJson}
                    title="Beautify and validate JSON formatting"
                  >
                    <Sparkles size={13} />
                    <span>Format JSON</span>
                  </button>

                  <button className="btn btn-secondary btn-sm" onClick={handleCopy} title="Copy JSON">
                    <Copy size={13} />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  {/* Save Changes button directly inside Peek Modal */}
                  <button
                    className={`btn btn-sm ${activeTab.isDirty ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleSaveDocument}
                    disabled={isSaving}
                    title="Save document changes to Cloudant"
                  >
                    {isSaving ? (
                      <RefreshCw size={13} className="spin-icon" />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>

                  {onOpenInEditor && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        onOpenInEditor(activeTab.db, activeTab.doc || { _id: activeTab.docId });
                        onClose();
                      }}
                      title="Open full document editor screen"
                    >
                      <Edit size={13} />
                      <span>Full Editor</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Historical Revision Warning Banner */}
              {isHistorical && (
                <div className="peek-historical-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="peek-historical-banner-title" style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} /> Viewing historical revision <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px' }}>{activeTab.selectedRev?.slice(0, 14)}...</code>
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      (Latest head is <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', background: 'rgba(0,0,0,0.15)', borderRadius: '3px' }}>{activeTab.latestRev?.slice(0, 14)}...</code>)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={handleRestoreHistoricalAsLatest}
                      title="Load this revision's content into current draft to save as newest revision"
                    >
                      <RotateCcw size={12} />
                      <span>Restore as Draft</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleSelectRev(activeTab.latestRev)}
                      title="Return to the latest revision"
                    >
                      <span>Jump to Latest</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Editable CodeMirror Editor */}
              <div
                className={`codemirror-wrapper ${isFullscreen ? 'is-fullscreen' : ''} ${isHistorical ? 'is-historical-editor' : ''}`}
                style={{
                  maxHeight: isFullscreen ? 'none' : '420px',
                  flex: isFullscreen ? 1 : undefined,
                  display: isFullscreen ? 'flex' : undefined,
                  flexDirection: isFullscreen ? 'column' : undefined,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
                onContextMenu={(e) => {
                  const sel = window.getSelection()?.toString() || '';
                  const cleaned = cleanDocId(sel);
                  if (cleaned) {
                    e.preventDefault();
                    setPeekContext({
                      isOpen: true,
                      position: { x: e.clientX, y: e.clientY },
                      selectedText: cleaned,
                    });
                  }
                }}
              >
                <CodeMirror
                  value={activeTab.editorText}
                  height={isFullscreen ? '100%' : '400px'}
                  style={isFullscreen ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  readOnly={false}
                  editable={true}
                  onChange={(val) => {
                    updateTab(activeTab.id, {
                      editorText: val,
                      isDirty: true,
                    });
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    bracketMatching: true,
                    autocompletion: true,
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileJson size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                No Document Loaded in This Tab
              </div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '380px', margin: '6px auto 0' }}>
                Enter a document _id above and hit Enter, or select text in any JSON view and press{' '}
                <kbd
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Alt+P
                </kbd>
                .
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Shortcut: Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>Alt+P</kbd> or right-click on selected text to peek in a new tab
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Local Peek Context Menu on CodeMirror selection */}
        <PeekContextMenu
          isOpen={peekContext.isOpen}
          position={peekContext.position}
          selectedText={peekContext.selectedText}
          databases={databases}
          currentDb={activeTab?.db || initialDb || ''}
          onSelectDb={(targetDb, text) => {
            handlePeekInNewTab(text, targetDb);
          }}
          onClose={() => setPeekContext((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}
