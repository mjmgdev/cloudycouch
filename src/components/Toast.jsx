import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss, onClose, type, message, title, id }) {
  // Support both list usage <Toast toasts={...} onDismiss={...} /> and single item usage
  const toastList = Array.isArray(toasts)
    ? toasts
    : message
    ? [{ id: id || 1, type, message, title }]
    : [];
  const dismissHandler = onDismiss || onClose || (() => {});

  useEffect(() => {
    if (!toastList || toastList.length === 0) return;
    const timer = setTimeout(() => {
      dismissHandler(toastList[0].id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastList, dismissHandler]);

  if (!toastList || !toastList.length) return null;

  return (
    <div className="toast-container">
      {toastList.map((toast) => {
        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
            ? AlertTriangle
            : Info;

        return (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              <div>
                {toast.title && <div style={{ fontWeight: 600 }}>{toast.title}</div>}
                <div>{toast.message}</div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => dismissHandler(toast.id)}
              style={{ padding: '4px' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
