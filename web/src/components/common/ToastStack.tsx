import { X } from 'lucide-react';
import type { Toast } from '../../hooks/useMessageNotifications';

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onOpen?: (conversationId: string) => void;
}

export function ToastStack({ toasts, onDismiss, onOpen }: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <button
            className="toast-body"
            onClick={() => {
              onOpen?.(t.conversationId);
              onDismiss(t.id);
            }}
          >
            <div className="toast-title">{t.title}</div>
            <div className="toast-text">{t.body}</div>
          </button>
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}