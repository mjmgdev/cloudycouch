import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { Download, Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { downloadFile, validateJson } from '../utils/helpers';
import { useModalEscape } from '../utils/modalStack';

export default function ImportExportModal({
  isOpen,
  initialMode = 'export', // 'export' | 'import'
  onClose,
  documents = [],
  dbName,
  onImportDocs,
  onNotify,
  theme = 'dark',
}) {
  useModalEscape({
    isOpen,
    onEscape: onClose,
    zIndex: 60,
    id: 'import-export-modal',
  });

  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode);

  // Export State
  const [exportFormat, setExportFormat] = useState('json');
  const [stripRev, setStripRev] = useState(false);

  // Import State
  const [importText, setImportText] = useState('');
  const [parsedDocs, setParsedDocs] = useState([]);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const cleanDocs = documents.map((d) => d.doc || d);

  // Handle Export Download
  const handleExport = () => {
    let exportData = cleanDocs;

    if (stripRev) {
      exportData = exportData.map((d) => {
        const copy = { ...d };
        delete copy._rev;
        return copy;
      });
    }

    if (exportFormat === 'json') {
      const jsonStr = JSON.stringify(exportData, null, 2);
      downloadFile(jsonStr, `${dbName}_export_${Date.now()}.json`, 'application/json');
    } else {
      // CSV Export
      if (exportData.length === 0) {
        onNotify('error', 'No documents to export');
        return;
      }
      const allKeys = Array.from(
        new Set(exportData.flatMap((d) => Object.keys(d)))
      );
      const header = allKeys.join(',');
      const rows = exportData.map((doc) => {
        return allKeys
          .map((k) => {
            const val = doc[k];
            if (val === undefined || val === null) return '""';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',');
      });
      const csvStr = [header, ...rows].join('\n');
      downloadFile(csvStr, `${dbName}_export_${Date.now()}.csv`, 'text/csv');
    }

    onNotify('success', `Exported ${exportData.length} documents successfully`);
    onClose();
  };

  // Handle File Upload for Import
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      processImportString(text);
    };
    reader.readAsText(file);
  };

  const processImportString = (text) => {
    setImportText(text);
    try {
      // Try parsing as standard JSON array or NDJSON (newline-delimited)
      let parsed;
      if (text.trim().startsWith('[')) {
        parsed = JSON.parse(text);
      } else {
        parsed = text
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of documents or NDJSON');
      }

      setParsedDocs(parsed);
      setImportError(null);
    } catch (err) {
      setImportDocs([]);
      setImportError(`Invalid format: ${err.message}`);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedDocs.length) {
      setImportError('No valid documents to import');
      return;
    }

    setIsImporting(true);
    try {
      await onImportDocs(parsedDocs);
      onNotify('success', `Imported ${parsedDocs.length} documents into ${dbName}`);
      onClose();
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'export' ? (
              <>
                <Download size={18} color="#38bdf8" />
                <span>Export Documents</span>
              </>
            ) : (
              <>
                <Upload size={18} color="#38bdf8" />
                <span>Import Documents</span>
              </>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div style={{ padding: '12px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${mode === 'export' ? 'active' : ''}`}
              onClick={() => setMode('export')}
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            <button
              className={`mode-btn ${mode === 'import' ? 'active' : ''}`}
              onClick={() => setMode('import')}
            >
              <Upload size={13} />
              <span>Import</span>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {mode === 'export' ? (
            /* EXPORT VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Exporting <strong>{cleanDocs.length}</strong> documents currently loaded from <code>{dbName}</code>.
              </div>

              <div className="form-group">
                <label className="form-label">Export Format</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    JSON Array
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    CSV Spreadsheet
                  </label>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={stripRev}
                  onChange={(e) => setStripRev(e.target.checked)}
                  style={{ accentColor: '#38bdf8' }}
                />
                <span>Omit CouchDB revision (<code>_rev</code>) for clean re-imports</span>
              </label>
            </div>
          ) : (
            /* IMPORT VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Upload a JSON or NDJSON file, or paste a JSON array of documents.
              </div>

              <input
                type="file"
                accept=".json,.txt"
                onChange={handleFileUpload}
                style={{ fontSize: '0.82rem' }}
              />

              <div className="form-group">
                <label className="form-label">Or Paste JSON Array</label>
                <div className="codemirror-wrapper">
                  <CodeMirror
                    value={importText}
                    height="160px"
                    placeholder='[ { "_id": "doc1", "title": "Example" } ]'
                    extensions={[json()]}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    onChange={(value) => processImportString(value)}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                    }}
                  />
                </div>
              </div>

              {importError && (
                <div className="editor-error-banner">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{importError}</span>
                </div>
              )}

              {parsedDocs.length > 0 && !importError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--accent-emerald)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Ready to import {parsedDocs.length} documents.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {mode === 'export' ? (
            <button className="btn btn-primary" onClick={handleExport}>
              <Download size={14} />
              <span>Download File</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleExecuteImport}
              disabled={isImporting || parsedDocs.length === 0 || Boolean(importError)}
            >
              <Upload size={14} />
              <span>{isImporting ? 'Importing...' : `Import ${parsedDocs.length || ''} Documents`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
