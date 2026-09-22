import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import {
  X,
  Save,
  Copy,
  Code2,
  SlidersHorizontal,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  FileCheck,
  Eye,
} from 'lucide-react';
import { validateJson, DOC_TEMPLATES } from '../utils/helpers';
import { useModalEscape } from '../utils/modalStack';

export default function DocumentEditor({
  isOpen,
  onClose,
  initialDoc,
  onSave,
  isSaving,
  onDuplicate,
  theme = 'dark',
  onPeek,
  onContextMenuPeek,
}) {
  if (!isOpen) return null;

  const isNew = !initialDoc?._rev;

  const [tab, setTab] = useState('raw'); // 'raw' | 'visual'
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [docId, setDocId] = useState('');
  const [docRev, setDocRev] = useState('');

  // Track initial state to detect modifications
  const initialJsonRef = useRef('');
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Visual mode fields: [{ key: '', type: 'string', value: '' }]
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (initialDoc) {
      setDocId(initialDoc._id || '');
      setDocRev(initialDoc._rev || '');

      const cleanDoc = { ...initialDoc };
      const formatted = JSON.stringify(cleanDoc, null, 2);
      setJsonText(formatted);
      initialJsonRef.current = formatted;
      setIsDirty(false);

      // Build visual fields
      const fList = Object.entries(cleanDoc)
        .filter(([k]) => k !== '_id' && k !== '_rev')
        .map(([k, v]) => {
          let type = typeof v;
          let val = v;
          if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
            type = 'json';
            val = JSON.stringify(v);
          }
          return { key: k, type, value: val };
        });
      setFields(fList);
    } else {
      const template = { ...DOC_TEMPLATES.ecommerce };
      setDocId(template._id);
      setDocRev('');
      const formatted = JSON.stringify(template, null, 2);
      setJsonText(formatted);
      initialJsonRef.current = formatted;
      setIsDirty(false);
      setFields(
        Object.entries(template)
          .filter(([k]) => k !== '_id')
          .map(([k, v]) => ({ key: k, type: typeof v, value: v }))
      );
    }
    setError(null);
    setShowCloseConfirm(false);
  }, [initialDoc]);

  // Request close: ask confirmation if unsaved changes exist
  const handleRequestClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Keyboard shortcut listener for Escape via modal stack (respects foreground modals)
  useModalEscape({
    isOpen,
    onEscape: () => {
      if (showCloseConfirm) {
        setShowCloseConfirm(false);
      } else {
        handleRequestClose();
      }
    },
    zIndex: showCloseConfirm ? 100 : 50,
    id: 'document-editor',
  });

  // Synchronize JSON changes
  const handleJsonChange = (val) => {
    setJsonText(val);
    setIsDirty(val !== initialJsonRef.current);
    const res = validateJson(val);
    if (!res.valid) {
      setError(res.error);
    } else {
      setError(null);
      if (res.data._id) setDocId(res.data._id);
      if (res.data._rev) setDocRev(res.data._rev);
    }
  };

  const handleFormatJson = () => {
    const res = validateJson(jsonText);
    if (res.valid) {
      const formatted = JSON.stringify(res.data, null, 2);
      setJsonText(formatted);
      setIsDirty(formatted !== initialJsonRef.current);
      setError(null);
    } else {
      setError(res.error);
    }
  };

  const handleApplyTemplate = (templateKey) => {
    const template = { ...DOC_TEMPLATES[templateKey] };
    template._id = `doc_${Math.floor(Math.random() * 10000)}`;
    setDocId(template._id);
    const formatted = JSON.stringify(template, null, 2);
    setJsonText(formatted);
    setIsDirty(formatted !== initialJsonRef.current);
    setError(null);
  };

  // Visual fields handlers
  const handleFieldChange = (index, prop, val) => {
    const updated = [...fields];
    updated[index][prop] = val;
    setFields(updated);
    syncVisualToJson(updated, docId, docRev);
  };

  const handleAddField = () => {
    const updated = [...fields, { key: `field_${fields.length + 1}`, type: 'string', value: '' }];
    setFields(updated);
    syncVisualToJson(updated, docId, docRev);
  };

  const handleRemoveField = (index) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    syncVisualToJson(updated, docId, docRev);
  };

  const syncVisualToJson = (fList, currentId, currentRev) => {
    const obj = {};
    if (currentId) obj._id = currentId;
    if (currentRev) obj._rev = currentRev;

    fList.forEach((f) => {
      if (!f.key) return;
      if (f.type === 'number') {
        obj[f.key] = Number(f.value) || 0;
      } else if (f.type === 'boolean') {
        obj[f.key] = f.value === true || f.value === 'true';
      } else if (f.type === 'json') {
        try {
          obj[f.key] = JSON.parse(f.value);
        } catch {
          obj[f.key] = f.value;
        }
      } else {
        obj[f.key] = f.value;
      }
    });

    const formatted = JSON.stringify(obj, null, 2);
    setJsonText(formatted);
    setIsDirty(formatted !== initialJsonRef.current);
    setError(null);
  };

  const handleSave = () => {
    const res = validateJson(jsonText);
    if (!res.valid) {
      setError(`Cannot save invalid JSON: ${res.error}`);
      return;
    }

    const payload = res.data;
    if (docId) payload._id = docId;
    if (docRev) payload._rev = docRev;

    setIsDirty(false);
    setShowCloseConfirm(false);
    onSave(payload);
  };

  return (
    <div className="drawer-backdrop" onClick={handleRequestClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{isNew ? 'Create Document' : 'Edit Document'}</span>
            {isDirty && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                ● Unsaved Changes
              </span>
            )}
            {docRev && !isDirty && (
              <span className="tag-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                rev: {docRev.slice(0, 10)}...
              </span>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleRequestClose} title="Close editor">
            <X size={18} />
          </button>
        </div>

        {/* Sub-header Tabs & Templates */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${tab === 'raw' ? 'active' : ''}`}
              onClick={() => setTab('raw')}
            >
              <Code2 size={13} />
              <span>JSON</span>
            </button>
            <button
              className={`mode-btn ${tab === 'visual' ? 'active' : ''}`}
              onClick={() => setTab('visual')}
            >
              <SlidersHorizontal size={13} />
              <span>Form</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isNew && (
              <select
                className="form-select"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Use Template...
                </option>
                <option value="ecommerce">E-commerce Product</option>
                <option value="user">User Profile</option>
                <option value="basic">Basic Document</option>
              </select>
            )}

            {tab === 'raw' && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const sel = window.getSelection()?.toString() || '';
                    onPeek && onPeek(sel);
                  }}
                  title="Peek document by selected text or ID (Alt+P)"
                >
                  <Eye size={13} color="var(--accent-cyan)" />
                  <span>Peek (Alt+P)</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleFormatJson}
                  title="Format and lint JSON"
                >
                  <FileCheck size={13} />
                  <span>Format</span>
                </button>
              </>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(jsonText)}
              title="Copy to clipboard"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Document ID row */}
          <div className="form-group">
            <label className="form-label">Document ID (_id)</label>
            <input
              type="text"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={docId}
              placeholder="auto-generated-if-empty"
              disabled={!isNew}
              onChange={(e) => {
                const newId = e.target.value;
                setDocId(newId);
                const res = validateJson(jsonText);
                if (res.valid) {
                  res.data._id = newId;
                  const newJson = JSON.stringify(res.data, null, 2);
                  setJsonText(newJson);
                  setIsDirty(newJson !== initialJsonRef.current);
                } else {
                  setIsDirty(true);
                }
              }}
            />
            {isNew && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Leave blank to automatically assign a generated UUID.
              </span>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="editor-error-banner">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: RAW JSON EDITOR (CAPABLE CODEMIRROR) */}
          {tab === 'raw' ? (
            <div className="form-group cm-editor-container-full" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Document JSON</label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Tip: Select text & press <kbd style={{ fontFamily: 'var(--font-mono)' }}>Alt+P</kbd> or right-click to Peek
                </span>
              </div>
              <div
                className={`codemirror-wrapper ${error ? 'has-error' : ''}`}
                style={{ flex: 1, minHeight: '380px' }}
                onContextMenu={(e) => {
                  const sel = window.getSelection()?.toString() || '';
                  if (sel && onContextMenuPeek) {
                    onContextMenuPeek(e, sel);
                  }
                }}
              >
                <CodeMirror
                  value={jsonText}
                  height="380px"
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  onChange={(value) => handleJsonChange(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                  }}
                />
              </div>
            </div>
          ) : (
            /* TAB 2: VISUAL FORM BUILDER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label">Attributes & Values</span>
                <button className="btn btn-secondary btn-sm" onClick={handleAddField}>
                  <Plus size={13} />
                  <span>Add Property</span>
                </button>
              </div>

              {fields.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 110px 2fr 36px',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Field name"
                    value={f.key}
                    onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                  />
                  <select
                    className="form-select"
                    value={f.type}
                    onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="json">json / obj</option>
                  </select>

                  {f.type === 'boolean' ? (
                    <select
                      className="form-select"
                      value={String(f.value)}
                      onChange={(e) => handleFieldChange(idx, 'value', e.target.value === 'true')}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      className="form-input"
                      placeholder="Value"
                      value={f.value}
                      onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                    />
                  )}

                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => handleRemoveField(idx)}
                    style={{ padding: '6px' }}
                  >
                    <Trash2 size={14} color="#f43f5e" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <div>
            {!isNew && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const res = validateJson(jsonText);
                  if (res.valid) onDuplicate(res.data);
                }}
              >
                <Copy size={13} />
                <span>Clone As New</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flex: 1 }}>
            <button
              className="btn btn-ghost"
              onClick={handleRequestClose}
            >
              Cancel
            </button>
            <button
              className={`btn ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleSave}
              disabled={!isDirty || isSaving || Boolean(error)}
              title={
                !isDirty
                  ? 'No changes detected'
                  : error
                  ? 'Resolve errors before saving'
                  : isNew
                  ? 'Create Document'
                  : 'Save Changes'
              }
              style={{
                opacity: !isDirty ? 0.5 : 1,
                cursor: !isDirty ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : isNew ? 'Create Document' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        {showCloseConfirm && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 100, background: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => setShowCloseConfirm(false)}
          >
            <div
              className="modal-dialog"
              style={{ maxWidth: '420px', padding: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Unsaved Changes
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                    You have unsaved changes in this document. Do you want to stay and save the changes, or discard them?
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  style={{ color: '#f43f5e' }}
                >
                  Discard Changes
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  Stay & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
