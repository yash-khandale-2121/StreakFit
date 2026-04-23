import { useState, useCallback, useId } from 'react';

let toastId = 0;

// Exported hook for adding toasts from outside
let _addToast = null;
export function addToast(msg, type = 'info') {
  _addToast?.(msg, type);
}

const ICONS = { success: '✓', warn: '⚠', danger: '✕', info: 'ℹ' };

export default function NotificationStack() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'info') => {
    const id = ++toastId;
    setToasts(t => [...t.slice(-3), { id, msg, type }]); // max 4
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // Expose globally
  _addToast = add;

  return (
    <div className="notif-stack" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`notif-toast notif-${t.type}`}
          onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        >
          <span className="notif-icon">{ICONS[t.type]}</span>
          <span className="notif-msg">{t.msg}</span>
          <button className="notif-close">×</button>
        </div>
      ))}
    </div>
  );
}
