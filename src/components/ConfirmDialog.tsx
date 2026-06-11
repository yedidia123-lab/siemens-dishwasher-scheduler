import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full">
        <button onClick={onCancel} className="absolute top-3 left-3 p-1 rounded hover:bg-slate-100 cursor-pointer">
          <X className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-amber-50 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed pt-1">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            אישור מחיקה
          </button>
        </div>
      </div>
    </div>
  );
}
