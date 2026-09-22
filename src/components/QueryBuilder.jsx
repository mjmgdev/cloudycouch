import React, { useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import {
  Play,
  RotateCcw,
  Sliders,
  Code2,
  Plus,
  Trash2,
  Clock,
  History,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { validateJson } from '../utils/helpers';

export default function QueryBuilder({
  selectedDb,
  onRunQuery,
  onResetQuery,
  isLoading,
  executionStats,
  theme = 'dark',
}) {
  const [queryMode, setQueryMode] = useState('raw'); // 'visual' | 'raw'
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Raw Query state
  const [rawJson, setRawJson] = useState(
    JSON.stringify(
      {
        selector: {},
        limit: 25,
      },
      null,
      2
    )
  );
  const [rawError, setRawError] = useState(null);

  // Visual filter starts with 1 empty condition row ready for user input
  const [filters, setFilters] = useState([
    { field: '', operator: '$eq', type: 'auto', value: '' },
  ]);
  const [limit, setLimit] = useState(25);

  // Query History from localStorage (last 20 queries per database)
  const historyStorageKey = `cloudant_history_${selectedDb || 'default'}`;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (stored) {
        setHistory(JSON.parse(stored));
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [historyStorageKey]);

  const saveToHistory = (queryObj) => {
    try {
      const summaryStr =
        queryObj.selector && Object.keys(queryObj.selector).length > 0
          ? JSON.stringify(queryObj.selector)
          : 'All documents (selector: {})';

      const entry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        summary: summaryStr.length > 80 ? summaryStr.slice(0, 80) + '...' : summaryStr,
        query: queryObj,
      };

      // De-duplicate if identical query exists
      const existingWithoutCurrent = history.filter(
        (h) => JSON.stringify(h.query) !== JSON.stringify(queryObj)
      );

      const updated = [entry, ...existingWithoutCurrent].slice(0, 20);
      setHistory(updated);
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save query history:', err);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(historyStorageKey);
  };

  const handleLoadHistoryItem = (item) => {
    setRawJson(JSON.stringify(item.query, null, 2));
    setRawError(null);
    setQueryMode('raw');
    setShowHistory(false);
  };

  // Build live generated JSON query from Visual Filter
  const generatedQuery = useMemo(() => {
    const selector = {};
    filters.forEach((f) => {
      const fieldName = f.field?.trim();
      if (!fieldName) return;

      let parsedVal = f.value;
      const type = f.type || 'auto';

      if (type === 'number') {
        parsedVal = Number(f.value) || 0;
      } else if (type === 'boolean') {
        parsedVal = f.value === true || f.value === 'true';
      } else if (type === 'json') {
        try {
          parsedVal = JSON.parse(f.value);
        } catch {
          parsedVal = f.value;
        }
      } else if (type === 'auto') {
        if (f.value === 'true') parsedVal = true;
        else if (f.value === 'false') parsedVal = false;
        else if (!isNaN(Number(f.value)) && f.value.trim() !== '') {
          parsedVal = Number(f.value);
        }
      }

      if (f.operator === '$in') {
        if (typeof parsedVal === 'string') {
          parsedVal = parsedVal.split(',').map((s) => {
            const trimmed = s.trim();
            if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            return trimmed;
          });
        }
      }

      if (f.operator === '$eq') {
        selector[fieldName] = parsedVal;
      } else {
        selector[fieldName] = { [f.operator]: parsedVal };
      }
    });

    return {
      selector,
      limit: Number(limit) || 25,
    };
  }, [filters, limit]);

  const generatedJsonString = useMemo(() => {
    return JSON.stringify(generatedQuery, null, 2);
  }, [generatedQuery]);

  // Visual filter row handlers
  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: '$eq', type: 'auto', value: '' }]);
  };

  const handleFilterChange = (idx, prop, val) => {
    const updated = [...filters];
    updated[idx][prop] = val;
    setFilters(updated);
  };

  const handleRemoveFilter = (idx) => {
    if (filters.length <= 1) {
      // If user removes the only remaining condition, reset it to a clean empty row
      setFilters([{ field: '', operator: '$eq', type: 'auto', value: '' }]);
    } else {
      setFilters(filters.filter((_, i) => i !== idx));
    }
  };

  const handleResetQuery = () => {
    setFilters([{ field: '', operator: '$eq', type: 'auto', value: '' }]);
    setRawJson(
      JSON.stringify(
        {
          selector: {},
          limit: 25,
        },
        null,
        2
      )
    );
    setRawError(null);
    if (onResetQuery) onResetQuery();
  };

  const handleTransferToRaw = () => {
    setRawJson(generatedJsonString);
    setRawError(null);
    setQueryMode('raw');
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Execution
  const executeVisualQuery = () => {
    saveToHistory(generatedQuery);
    onRunQuery(generatedQuery);
  };

  const executeRawQuery = () => {
    const res = validateJson(rawJson);
    if (!res.valid) {
      setRawError(res.error);
      return;
    }
    setRawError(null);
    saveToHistory(res.data);
    onRunQuery(res.data);
  };

  return (
    <div className="query-card">
      {/* Query Bar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${queryMode === 'raw' ? 'active' : ''}`}
              onClick={() => setQueryMode('raw')}
            >
              <Code2 size={14} />
              <span>Editor</span>
            </button>
            <button
              className={`mode-btn ${queryMode === 'visual' ? 'active' : ''}`}
              onClick={() => setQueryMode('visual')}
            >
              <Sliders size={14} />
              <span>Filter</span>
            </button>
          </div>

          <button
            className={`btn btn-sm ${showHistory ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setShowHistory(!showHistory)}
            title="View last 20 queries for this database"
            style={{ gap: '6px' }}
          >
            <History size={14} color="#38bdf8" />
            <span>History ({history.length})</span>
          </button>

          {executionStats && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              <Clock size={12} color="#38bdf8" />
              <span>{executionStats.execution_time_ms || 3}ms</span>
              <span>•</span>
              <span>
                {executionStats.results_returned ?? executionStats.total_keys_examined ?? 0} results
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleResetQuery}
            title="Reset query and show all documents"
          >
            <RotateCcw size={13} />
            <span>Reset Query</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={queryMode === 'visual' ? executeVisualQuery : executeRawQuery}
            disabled={isLoading}
          >
            <Play size={13} />
            <span>{isLoading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Query History Panel */}
      {showHistory && (
        <div className="query-history-panel">
          <div className="history-header">
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} color="#38bdf8" />
              <span>Query History for <code>{selectedDb}</code> (Last 20)</span>
            </span>
            {history.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearHistory}
                style={{ fontSize: '0.75rem', color: '#f43f5e' }}
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>
              No query history recorded yet for this database. Run a query and it will be saved here automatically.
            </div>
          ) : (
            <div className="history-items-list">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => handleLoadHistoryItem(item)}
                  title="Click to load into editor"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span className="history-query-snippet">{item.summary}</span>
                    <span className="history-time">{new Date(item.timestamp).toLocaleTimeString()} • {new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    <span>Load</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 1: VISUAL FILTER BUILDER */}
      {queryMode === 'visual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filters.map((f, idx) => (
              <div key={idx} className="filter-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Field name (e.g. price, category)"
                  value={f.field}
                  onChange={(e) => handleFilterChange(idx, 'field', e.target.value)}
                />

                <select
                  className="form-select"
                  value={f.operator}
                  onChange={(e) => handleFilterChange(idx, 'operator', e.target.value)}
                >
                  <option value="$eq">equals ($eq)</option>
                  <option value="$gt">greater than ($gt)</option>
                  <option value="$gte">greater or equal ($gte)</option>
                  <option value="$lt">less than ($lt)</option>
                  <option value="$lte">less or equal ($lte)</option>
                  <option value="$regex">regex ($regex)</option>
                  <option value="$in">in list ($in)</option>
                </select>

                <select
                  className="form-select"
                  value={f.type || 'auto'}
                  onChange={(e) => handleFilterChange(idx, 'type', e.target.value)}
                  title="Value Data Type"
                >
                  <option value="auto">Type: Auto</option>
                  <option value="string">Type: String</option>
                  <option value="number">Type: Number</option>
                  <option value="boolean">Type: Boolean</option>
                  <option value="json">Type: JSON</option>
                </select>

                {f.type === 'boolean' ? (
                  <select
                    className="form-select"
                    value={String(f.value)}
                    onChange={(e) => handleFilterChange(idx, 'value', e.target.value === 'true')}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    className="form-input"
                    placeholder={f.operator === '$in' ? 'item1, item2, item3' : 'Value'}
                    value={f.value}
                    onChange={(e) => handleFilterChange(idx, 'value', e.target.value)}
                  />
                )}

                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleRemoveFilter(idx)}
                  style={{ padding: '6px' }}
                  title="Remove filter"
                >
                  <Trash2 size={14} color="#f43f5e" />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleAddFilter}>
                <Plus size={13} />
                <span>Add Condition</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Max limit:</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '70px', padding: '4px 8px' }}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Live Generated JSON Preview */}
          <div className="query-preview-card">
            <div className="query-preview-header">
              <span className="query-preview-title">
                <Code2 size={13} />
                <span>Preview</span>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopyPreview}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleTransferToRaw}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  <ArrowRight size={12} />
                  <span>Open in Editor</span>
                </button>
              </div>
            </div>

            <div className="codemirror-wrapper" style={{ marginTop: '4px' }}>
              <CodeMirror
                value={generatedJsonString}
                height="150px"
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
        </div>
      ) : (
        /* MODE 2: CAPABLE CODEMIRROR QUERY EDITOR */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="codemirror-wrapper">
            <CodeMirror
              value={rawJson}
              height="280px"
              extensions={[json()]}
              theme={theme === 'dark' ? 'dark' : 'light'}
              onChange={(value) => {
                setRawJson(value);
                const res = validateJson(value);
                setRawError(res.valid ? null : res.error);
              }}
            />
          </div>

          {rawError && (
            <div className="editor-error-banner">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Invalid JSON Query: {rawError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
