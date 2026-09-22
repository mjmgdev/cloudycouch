import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DocumentTable from './components/DocumentTable';
import DocumentEditor from './components/DocumentEditor';
import QueryBuilder from './components/QueryBuilder';
import IndexManager from './components/IndexManager';
import CreateDbModal from './components/CreateDbModal';
import ImportExportModal from './components/ImportExportModal';
import Toast from './components/Toast';
import StorageAnalytics from './components/StorageAnalytics';
import PeekModal from './components/PeekModal';
import PeekContextMenu from './components/PeekContextMenu';
import ConnectionScreen from './components/ConnectionScreen';
import { api } from './api/cloudantApi';
import { Layers, Database, ListFilter, Sliders, RefreshCw, FileText, Search, X } from 'lucide-react';
import { formatBytes, cleanDocId } from './utils/helpers';

export default function App() {
  // Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cloudant_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cloudant_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sidebar Visibility & Mobile State
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return false;
    const saved = localStorage.getItem('cloudant_sidebar');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => {
          const next = !prev;
          if (!isMobile) localStorage.setItem('cloudant_sidebar', String(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (!isMobile) localStorage.setItem('cloudant_sidebar', String(next));
      return next;
    });
  };

  // Global App State
  const [status, setStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [selectedDbInfo, setSelectedDbInfo] = useState(null);

  // Active View Tab: 'documents' | 'query' | 'indexes'
  const [activeTab, setActiveTab] = useState('documents');

  // Main View: 'explorer' | 'analytics'
  const [mainView, setMainView] = useState('explorer');

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Quick Find by ID Prefix State
  const [idPrefix, setIdPrefix] = useState('');
  const [prefixInput, setPrefixInput] = useState('');

  // Query State
  const [activeQuery, setActiveQuery] = useState(null);
  const [queryExecutionStats, setQueryExecutionStats] = useState(null);
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  // Modals & Drawers
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const [createDbOpen, setCreateDbOpen] = useState(false);
  const [importExportModal, setImportExportModal] = useState({ open: false, mode: 'export' });

  // Peek Document State
  const [peekModal, setPeekModal] = useState({
    isOpen: false,
    docId: '',
    db: '',
  });

  const [peekContext, setPeekContext] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    selectedText: '',
    db: '',
  });

  const handleOpenPeek = useCallback((docId, db = selectedDb) => {
    setPeekContext((prev) => ({ ...prev, isOpen: false }));
    setPeekModal({
      isOpen: true,
      docId: cleanDocId(docId) || '',
      db: db || selectedDb || (databases[0]?.name || ''),
      timestamp: Date.now(),
    });
  }, [selectedDb, databases]);

  const handleTriggerContextMenu = useCallback((e, text, db = selectedDb) => {
    const cleaned = cleanDocId(text);
    if (!cleaned) return;
    e.preventDefault();
    setPeekContext({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      selectedText: cleaned,
      db: db || selectedDb || (databases[0]?.name || ''),
    });
  }, [selectedDb, databases]);

  const handleOpenPeekInEditor = useCallback((dbName, doc) => {
    if (dbName && dbName !== selectedDb) {
      setSelectedDb(dbName);
    }
    setEditingDoc(doc);
    setEditorOpen(true);
  }, [selectedDb]);

  // Global Alt+P / Alt+F12 shortcut for Peek
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'p') || (e.altKey && e.key === 'F12')) {
        e.preventDefault();
        const sel = window.getSelection()?.toString() || '';
        const cleaned = cleanDocId(sel);
        handleOpenPeek(cleaned, selectedDb);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleOpenPeek, selectedDb]);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message, title) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Connection Status
  const fetchStatus = async () => {
    try {
      const s = await api.getStatus();
      setStatus(s);
      return s;
    } catch (err) {
      const fallback = { connected: false, error: err.message, demoMode: false };
      setStatus(fallback);
      return fallback;
    }
  };

  // Connection Handlers
  const handleConnectSuccess = async (connectionInfo) => {
    setIsRefreshing(true);
    addToast('success', `Connected to Cloudant (${connectionInfo.version || 'Connected'})`);
    await fetchStatus();
    await fetchDatabases(false);
    setIsRefreshing(false);
  };

  const handleConnectSandbox = async () => {
    setIsRefreshing(true);
    try {
      await api.connectSandbox();
      addToast('info', 'Switched to Interactive Offline Sandbox');
      await fetchStatus();
      await fetchDatabases(false);
    } catch (err) {
      addToast('error', `Failed to start sandbox: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnect();
      setStatus({
        connected: false,
        demoMode: false,
        isDev: status?.isDev,
        envConfigured: status?.envConfigured,
      });
      setDatabases([]);
      setSelectedDb(null);
      setDocuments([]);
      addToast('info', 'Disconnected from database instance');
    } catch (err) {
      addToast('error', `Failed to disconnect: ${err.message}`);
    }
  };

  // Fetch Databases List
  const fetchDatabases = async (preserveSelected = true) => {
    try {
      const list = await api.listDatabases();
      setDatabases(list);

      if (list.length > 0) {
        if (!preserveSelected || !selectedDb || !list.find((d) => d.name === selectedDb)) {
          setSelectedDb(list[0].name);
        }
      } else {
        setSelectedDb(null);
      }
    } catch (err) {
      addToast('error', `Failed to list databases: ${err.message}`);
    }
  };

  // Fetch Database Info & Documents
  const fetchDocs = useCallback(async () => {
    if (!selectedDb) {
      setDocuments([]);
      setTotalRows(0);
      return;
    }

    setIsLoadingDocs(true);
    try {
      if (activeQuery) {
        // Execute Mango query
        setIsQueryRunning(true);
        const res = await api.findDocuments(selectedDb, {
          ...activeQuery,
          limit: pageSize,
          skip: page * pageSize,
        });
        setDocuments(res.docs || []);
        setTotalRows(res.docs?.length || 0);
        setQueryExecutionStats(res.execution_stats || null);
      } else {
        // Normal _all_docs with optional ID prefix filter
        const res = await api.getDocuments(selectedDb, {
          limit: pageSize,
          skip: page * pageSize,
          prefix: idPrefix || undefined,
        });
        setDocuments(res.rows || []);
        setTotalRows(res.total_rows || 0);
        setQueryExecutionStats(null);
      }

      // Also get db info
      const info = await api.getDatabaseInfo(selectedDb);
      setSelectedDbInfo(info);
    } catch (err) {
      addToast('error', `Failed to load documents from ${selectedDb}: ${err.message}`);
    } finally {
      setIsLoadingDocs(false);
      setIsQueryRunning(false);
    }
  }, [selectedDb, page, pageSize, activeQuery, idPrefix]);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsRefreshing(true);
      const s = await fetchStatus();
      if (s && (s.connected || s.demoMode)) {
        await fetchDatabases(false);
      }
      setIsRefreshing(false);
    };
    init();
  }, []);

  // When selected DB or pagination/query changes, refetch docs
  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Manual Refresh
  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    await fetchDatabases(true);
    await fetchDocs();
    setIsRefreshing(false);
    addToast('info', 'Cloudant metadata refreshed');
  };

  // Toggle Demo Sandbox Mode
  const handleToggleDemo = async (enabled) => {
    setIsRefreshing(true);
    try {
      await api.toggleDemo(enabled);
      await fetchStatus();
      await fetchDatabases(false);
      addToast('success', enabled ? 'Switched to Demo Sandbox' : 'Switched to Live Cloudant');
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create Database
  const handleCreateDatabase = async (name, partitioned) => {
    await api.createDatabase(name, partitioned);
    addToast('success', `Database "${name}" created`);
    await fetchDatabases(true);
    setSelectedDb(name);
    setPage(0);
    setActiveQuery(null);
  };

  // Delete Database
  const handleDeleteDatabase = async (dbName) => {
    if (!confirm(`Are you sure you want to completely delete database "${dbName}"? All documents will be permanently lost.`)) {
      return;
    }

    try {
      await api.deleteDatabase(dbName);
      addToast('success', `Database "${dbName}" deleted`);
      await fetchDatabases(false);
    } catch (err) {
      addToast('error', `Failed to delete database: ${err.message}`);
    }
  };

  // Document CRUD: Save (Create or Update)
  const handleSaveDocument = async (docPayload) => {
    if (!selectedDb) return;
    setIsSavingDoc(true);

    try {
      if (editingDoc?._rev) {
        // Update
        const res = await api.updateDocument(selectedDb, docPayload._id, docPayload);
        addToast('success', `Document ${docPayload._id} updated (rev ${res.rev.slice(0, 8)}...)`);
      } else {
        // Create
        const res = await api.createDocument(selectedDb, docPayload);
        addToast('success', `Document ${res.id} created successfully`);
      }
      setEditorOpen(false);
      setEditingDoc(null);
      fetchDocs();
      fetchDatabases(true);
    } catch (err) {
      addToast('error', `Save failed: ${err.message}`);
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Document CRUD: Delete
  const handleDeleteDocument = async (id, rev) => {
    if (!confirm(`Are you sure you want to delete document "${id}"?`)) return;

    try {
      await api.deleteDocument(selectedDb, id, rev);
      addToast('success', `Document "${id}" deleted`);
      fetchDocs();
      fetchDatabases(true);
    } catch (err) {
      addToast('error', `Delete failed: ${err.message}`);
    }
  };

  // Document CRUD: Bulk Delete
  const handleBulkDelete = async (ids) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} selected documents?`)) return;

    try {
      const docsToDelete = documents
        .map((d) => d.doc || d)
        .filter((d) => ids.includes(d._id))
        .map((d) => ({ _id: d._id, _rev: d._rev, _deleted: true }));

      await api.bulkDocs(selectedDb, docsToDelete);
      addToast('success', `Deleted ${ids.length} documents`);
      fetchDocs();
      fetchDatabases(true);
    } catch (err) {
      addToast('error', `Bulk delete failed: ${err.message}`);
    }
  };

  // Document CRUD: Duplicate
  const handleDuplicateDocument = (doc) => {
    const clone = { ...doc };
    delete clone._rev;
    clone._id = `${clone._id}_copy_${Math.floor(Math.random() * 1000)}`;
    setEditingDoc(clone);
    setEditorOpen(true);
  };

  // Document Import
  const handleImportDocuments = async (docs) => {
    await api.bulkDocs(selectedDb, docs);
    fetchDocs();
    fetchDatabases(true);
  };

  // Query Execution
  const handleRunMangoQuery = (query) => {
    setActiveQuery(query);
    setPage(0);
    setActiveTab('documents'); // Switch back to view results in table
    addToast('info', 'Executing Mango query...');
  };

  const handleClearQuery = () => {
    setActiveQuery(null);
    setQueryExecutionStats(null);
    setPage(0);
  };

  // If not connected and not in demo mode, display the Connection Screen
  if (status && !status.connected && !status.demoMode) {
    return (
      <div className="app-container" data-theme={theme}>
        <ConnectionScreen
          status={status}
          onConnectSuccess={handleConnectSuccess}
          onConnectSandbox={handleConnectSandbox}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        {/* Toast Notification Container */}
        <Toast toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        status={status}
        onRefresh={handleGlobalRefresh}
        onToggleDemo={handleToggleDemo}
        onDisconnect={handleDisconnect}
        isRefreshing={isRefreshing}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main Workspace Layout */}
      <div className="main-layout">
        {/* Mobile Backdrop Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Left Sidebar */}
        <Sidebar
          databases={databases}
          selectedDb={selectedDb}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onCloseMobile={() => setSidebarOpen(false)}
          currentView={mainView}
          onViewChange={setMainView}
          onSelectDb={(db) => {
            setSelectedDb(db);
            setMainView('explorer');
            setPage(0);
            setActiveQuery(null);
            setIdPrefix('');
            setPrefixInput('');
          }}
          onCreateDbClick={() => setCreateDbOpen(true)}
          onDeleteDb={handleDeleteDatabase}
          onDisconnect={handleDisconnect}
        />

        {/* Content Area */}
        <main className="content-area">
          {mainView === 'analytics' ? (
            <StorageAnalytics
              databases={databases}
              onSelectDb={(dbName) => {
                setSelectedDb(dbName);
                setMainView('explorer');
                setPage(0);
                setActiveQuery(null);
                setIdPrefix('');
                setPrefixInput('');
              }}
              onRefresh={handleGlobalRefresh}
              isRefreshing={isRefreshing}
            />
          ) : selectedDb ? (
            <>
              {/* Content Top Toolbar */}
              <div className="content-toolbar">
                <div className="db-hero-meta">
                  <span className="db-title">{selectedDb}</span>
                  {selectedDbInfo?.partitioned && (
                    <span className="tag-pill partitioned">
                      <Layers size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                      Partitioned
                    </span>
                  )}
                  <span className="tag-pill">
                    {selectedDbInfo?.doc_count ?? totalRows} docs
                  </span>
                  {selectedDbInfo?.disk_size && (
                    <span className="tag-pill">
                      {formatBytes(selectedDbInfo.disk_size)}
                    </span>
                  )}
                </div>

                <div className="toolbar-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingDoc(null);
                      setEditorOpen(true);
                    }}
                  >
                    + New Document
                  </button>
                </div>
              </div>

              {/* View Navigation Tabs */}
              <div className="view-tabs">
                <div className="view-tabs-left">
                  <button
                    className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                  >
                    <FileText size={15} />
                    <span>Documents</span>
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                    onClick={() => setActiveTab('query')}
                  >
                    <Sliders size={15} />
                    <span>Query</span>
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'indexes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('indexes')}
                  >
                    <ListFilter size={15} />
                    <span>Indexes</span>
                  </button>
                </div>

                {/* Right-aligned Quick Find by ID Prefix */}
                <div className="view-tabs-right">
                  <div className="prefix-search-wrap">
                    <Search size={13} className="prefix-icon" />
                    <input
                      type="text"
                      className="prefix-input"
                      placeholder="Find by ID... (Press Enter)"
                      value={prefixInput}
                      onChange={(e) => setPrefixInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = prefixInput.trim();
                          setIdPrefix(val);
                          setActiveQuery(null);
                          setPage(0);
                          setActiveTab('documents');
                        }
                      }}
                    />
                    {prefixInput && (
                      <button
                        className="prefix-clear-btn"
                        title="Clear prefix search"
                        onClick={() => {
                          setPrefixInput('');
                          setIdPrefix('');
                          setPage(0);
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content Body */}
              <div className="view-body">
                {activeTab === 'documents' && (
                  <DocumentTable
                    documents={documents}
                    totalRows={totalRows}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    selectedDb={selectedDb}
                    isPartitioned={selectedDbInfo?.partitioned}
                    onNewDoc={() => {
                      setEditingDoc(null);
                      setEditorOpen(true);
                    }}
                    onEditDoc={(doc) => {
                      setEditingDoc(doc);
                      setEditorOpen(true);
                    }}
                    onDuplicateDoc={handleDuplicateDocument}
                    onDeleteDoc={handleDeleteDocument}
                    onBulkDelete={handleBulkDelete}
                    onExportClick={() => setImportExportModal({ open: true, mode: 'export' })}
                    onImportClick={() => setImportExportModal({ open: true, mode: 'import' })}
                    activeFilter={activeQuery}
                    onClearFilter={handleClearQuery}
                    idPrefix={idPrefix}
                    onClearPrefix={() => {
                      setIdPrefix('');
                      setPrefixInput('');
                      setPage(0);
                    }}
                    theme={theme}
                    onPeek={handleOpenPeek}
                    onContextMenuPeek={handleTriggerContextMenu}
                  />
                )}

                {activeTab === 'query' && (
                  <QueryBuilder
                    selectedDb={selectedDb}
                    onRunQuery={handleRunMangoQuery}
                    onResetQuery={handleClearQuery}
                    isLoading={isQueryRunning}
                    executionStats={queryExecutionStats}
                    theme={theme}
                  />
                )}

                {activeTab === 'indexes' && (
                  <IndexManager
                    selectedDb={selectedDb}
                    onNotify={addToast}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <Database className="empty-state-icon" style={{ width: '64px', height: '64px' }} />
              <div className="empty-state-title">No Database Selected</div>
              <div className="empty-state-desc">
                Select an existing database from the sidebar, or create a new one to begin managing documents.
              </div>
              <button className="btn btn-primary" onClick={() => setCreateDbOpen(true)}>
                + Create Database
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Document Drawer Modal (Create / Edit) */}
      <DocumentEditor
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingDoc(null);
        }}
        initialDoc={editingDoc}
        onSave={handleSaveDocument}
        isSaving={isSavingDoc}
        onDuplicate={handleDuplicateDocument}
        theme={theme}
        onPeek={handleOpenPeek}
        onContextMenuPeek={handleTriggerContextMenu}
      />

      {/* Create Database Modal */}
      <CreateDbModal
        isOpen={createDbOpen}
        onClose={() => setCreateDbOpen(false)}
        onCreate={handleCreateDatabase}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={importExportModal.open}
        initialMode={importExportModal.mode}
        onClose={() => setImportExportModal({ ...importExportModal, open: false })}
        documents={documents}
        dbName={selectedDb}
        onImportDocs={handleImportDocuments}
        onNotify={addToast}
        theme={theme}
      />

      {/* Peek Document Modal */}
      <PeekModal
        isOpen={peekModal.isOpen}
        onClose={() => setPeekModal((prev) => ({ ...prev, isOpen: false }))}
        initialDocId={peekModal.docId}
        initialDb={peekModal.db}
        peekRequest={peekModal.timestamp}
        databases={databases}
        onOpenInEditor={handleOpenPeekInEditor}
        onDocSaved={(db) => {
          if (db === selectedDb) {
            fetchDocs();
          }
          fetchDatabases(true);
        }}
        onNotify={addToast}
        theme={theme}
      />

      {/* Peek Right-Click Context Menu */}
      <PeekContextMenu
        isOpen={peekContext.isOpen}
        position={peekContext.position}
        selectedText={peekContext.selectedText}
        databases={databases}
        currentDb={peekContext.db}
        onSelectDb={(db, text) => handleOpenPeek(text, db)}
        onClose={() => setPeekContext((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
