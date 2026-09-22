import { useEffect, useRef } from 'react';

/**
 * Global modal & dialog stack manager.
 * Tracks active modals, drawers, and overlays, and ensures the Escape key
 * only dismisses the topmost / front-most dialog.
 */

let modalStack = [];
let sequenceCounter = 0;
let listenerAttached = false;

function getTopModal() {
  if (modalStack.length === 0) return null;

  // Sort descending:
  // 1. priority (higher priority first)
  // 2. zIndex (higher zIndex first)
  // 3. order (more recently opened/registered first)
  const sorted = [...modalStack].sort((a, b) => {
    if ((b.priority || 0) !== (a.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    if ((b.zIndex || 0) !== (a.zIndex || 0)) {
      return (b.zIndex || 0) - (a.zIndex || 0);
    }
    return (b.order || 0) - (a.order || 0);
  });

  return sorted[0];
}

function handleKeyDownCapture(e) {
  if (e.key !== 'Escape') return;

  const topModal = getTopModal();
  if (!topModal) return;

  // Prevent event from bubbling down to inputs or background modals
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (typeof topModal.onEscape === 'function') {
    topModal.onEscape(e);
  }
}

function ensureListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeyDownCapture, true); // capture phase
  listenerAttached = true;
}

/**
 * Register a modal in the global stack.
 * Returns an unregister function.
 */
export function registerModal({ id, zIndex = 0, priority = 0, onEscape }) {
  ensureListener();

  const order = ++sequenceCounter;
  const existingIdx = modalStack.findIndex((m) => m.id === id);

  const entry = {
    id,
    zIndex,
    priority,
    order: existingIdx >= 0 ? modalStack[existingIdx].order : order,
    onEscape,
    timestamp: Date.now(),
  };

  if (existingIdx >= 0) {
    modalStack[existingIdx] = entry;
  } else {
    modalStack.push(entry);
  }

  return () => {
    unregisterModal(id);
  };
}

/**
 * Unregister a modal by id.
 */
export function unregisterModal(id) {
  modalStack = modalStack.filter((m) => m.id !== id);
}

/**
 * Get current modal stack (useful for debugging/testing).
 */
export function getModalStack() {
  return [...modalStack];
}

let nextAutoId = 0;

/**
 * React hook to register a modal or dialog with the Escape key manager.
 * When Escape is pressed, only the front-most modal's onEscape handler is executed.
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is currently open
 * @param {Function} options.onEscape - Handler called when Esc is pressed and this modal is in front
 * @param {number} [options.zIndex=0] - CSS z-index of the modal/overlay
 * @param {number} [options.priority=0] - Optional priority override
 * @param {string} [options.id] - Unique ID for the modal
 */
export function useModalEscape({
  isOpen,
  onEscape,
  zIndex = 0,
  priority = 0,
  id,
}) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const idRef = useRef(id);
  if (!idRef.current) {
    idRef.current = `modal-${++nextAutoId}`;
  }

  useEffect(() => {
    if (!isOpen) {
      unregisterModal(idRef.current);
      return;
    }

    const unregister = registerModal({
      id: idRef.current,
      zIndex,
      priority,
      onEscape: (e) => onEscapeRef.current?.(e),
    });

    return unregister;
  }, [isOpen, zIndex, priority]);
}
