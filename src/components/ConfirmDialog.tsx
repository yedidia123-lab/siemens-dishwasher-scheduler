import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#18182a] border border-[#252538] rounded-2xl shadow-2xl shadow-black/60 p-6 max-w-sm w-full animate-fade-in">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent rounded-t-2xl" />
        <button
          onClick={onCancel}
          className="absolute top-3 left-3 p-1.5 rounded-lg hover:bg-[#252538] text-[#4e4e6a] hover:text-[#8b8aa0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-amber-950/40 border border-amber-800/40 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-[#ccc8dc] leading-relaxed pt-1">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold text-[#8b8aa0] bg-[#13131e] hover:bg-[#1e1e30] border border-[#252538] rounded-xl transition-colors cursor-pointer"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 text-sm font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-xl transition-colors cursor-pointer shadow-lg shadow-rose-950/40"
          >
            אישור מחיקה
          </button>
        </div>
      </div>
    </div>
  );
}
