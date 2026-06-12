import { useEffect } from "react";
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
  success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
  error:   <XCircle    className="w-4 h-4 text-rose-400   shrink-0 mt-0.5" />,
  warn:    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
  info:    <Info       className="w-4 h-4 text-[#c9a84c]  shrink-0 mt-0.5" />,
};

const STYLES = {
  success: "bg-[#0e1f18]/95 border-emerald-800/50 text-emerald-200",
  error:   "bg-[#1f0e0e]/95 border-rose-800/50   text-rose-200",
  warn:    "bg-[#1f1608]/95 border-amber-800/50  text-amber-200",
  info:    "bg-[#18182a]/95 border-[#c9a84c]/25  text-[#e8ddc0]",
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.type === "error" ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur text-sm font-medium max-w-sm w-full animate-fade-in ${STYLES[toast.type]}`}
      dir="rtl"
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-40 hover:opacity-80 transition-opacity cursor-pointer mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-24 md:bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
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
