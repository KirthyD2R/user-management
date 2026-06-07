import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

/**
 * Module-level bridge so non-React code (e.g. the Axios interceptor in
 * api/client.ts) can surface toasts without access to React context.
 * The ToastProvider registers its showToast here on mount.
 */
type ShowToast = (message: string, type: 'success' | 'error') => void;
let externalShowToast: ShowToast | null = null;
export function toast(message: string, type: 'success' | 'error' = 'error') {
  externalShowToast?.(message, type);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (!message) return;
    setToasts((prev) => {
      // De-dupe: don't stack an identical message that's already visible
      if (prev.some((t) => t.message === message && t.type === type)) return prev;
      const id = ++toastId;
      return [...prev, { id, message, type }];
    });
  }, []);

  // Expose showToast to the module-level bridge for non-React callers
  useEffect(() => {
    externalShowToast = showToast;
    return () => {
      if (externalShowToast === showToast) externalShowToast = null;
    };
  }, [showToast]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-slide-in ${
        toast.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      <p className="flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="shrink-0 p-0.5 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
