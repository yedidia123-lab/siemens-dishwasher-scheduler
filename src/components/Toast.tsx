import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  error: <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
};

const STYLES = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-rose-50 border-rose-200 text-rose-800",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.type === "error" ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg text-sm font-semibold max-w-sm w-full animate-fade-in ${STYLES[toast.type]}`}
      dir="rtl"
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

let _id = 0;
export function makeToast(type: ToastType, message: string): ToastData {
  return { id: String(++_id), type, message };
}
