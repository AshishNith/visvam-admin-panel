import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { Order } from "../lib/api";
import {
  downloadOrderRegisterCsv,
  monthKey,
  openOrderReport,
  periodLabel,
  reportMonths,
  type ReportMonth,
} from "../lib/orderReport";

interface ExportReportDialogProps {
  orders: Order[];
  onClose: () => void;
}

/**
 * The month the accountant most likely wants: the last one that has finished.
 * Falls back to the newest month with orders when that one had none.
 */
function defaultSelection(months: ReportMonth[]): string[] {
  if (months.length === 0) return [];
  const [year, month] = monthKey(new Date()).split("-").map(Number);
  const previous = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  return [months.some((m) => m.key === previous) ? previous : months[0].key];
}

export default function ExportReportDialog({ orders, onClose }: ExportReportDialogProps) {
  const months = useMemo(() => reportMonths(orders), [orders]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultSelection(months)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const keys = months.filter((m) => selected.has(m.key)).map((m) => m.key);
  const chosen = months.filter((m) => selected.has(m.key));
  const orderCount = chosen.reduce((s, m) => s + m.orders, 0);
  const value = chosen.reduce((s, m) => s + m.value, 0);
  const allSelected = months.length > 0 && keys.length === months.length;

  const handlePdf = () => {
    if (!openOrderReport(orders, keys)) {
      toast.error("The report tab was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    onClose();
  };

  const handleCsv = () => {
    downloadOrderRegisterCsv(orders, keys);
    toast.success(`Order register for ${periodLabel(keys)} downloaded.`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export orders report"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#241a12]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#241a12]/10 pb-3">
          <div>
            <h3 className="text-sm font-bold">Export orders report</h3>
            <p className="text-[11px] text-[#6d5c4c] mt-0.5">Choose the months to include.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#6d5c4c] hover:text-[#241a12]">
            <X size={18} />
          </button>
        </div>

        {months.length === 0 ? (
          <p className="text-xs text-[#6d5c4c] py-6 text-center">There are no orders to report on yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6d5c4c]">
                {keys.length === 0 ? "No month selected" : `${keys.length} of ${months.length} months selected`}
              </span>
              <button
                onClick={() => setSelected(new Set(allSelected ? [] : months.map((m) => m.key)))}
                className="font-semibold text-[#8a4f27] hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-[#241a12]/10 divide-y divide-[#241a12]/5">
              {months.map((m) => (
                <label
                  key={m.key}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs cursor-pointer transition-colors ${
                    selected.has(m.key) ? "bg-[#faf7f2]" : "hover:bg-[#faf7f2]/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.key)}
                    onChange={() => toggle(m.key)}
                    className="h-3.5 w-3.5 accent-[#3a2012]"
                  />
                  <span className="font-semibold flex-1">{m.label}</span>
                  <span className="text-[#6d5c4c]">
                    {m.orders} {m.orders === 1 ? "order" : "orders"}
                  </span>
                  <span className="font-mono w-20 text-right">₹{Math.round(m.value).toLocaleString("en-IN")}</span>
                </label>
              ))}
            </div>

            <p className="text-[11px] text-[#6d5c4c]">
              {keys.length === 0
                ? "Select at least one month to export."
                : `${periodLabel(keys)} — ${orderCount} ${orderCount === 1 ? "order" : "orders"}, ₹${Math.round(value).toLocaleString("en-IN")}. Cancelled orders and unpaid online checkouts are not counted.`}
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCsv}
                disabled={keys.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#241a12]/15 text-xs font-semibold text-[#3a2012] hover:bg-[#f4ece1] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={14} /> Excel (CSV)
              </button>
              <button
                onClick={handlePdf}
                disabled={keys.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#3a2012] text-white text-xs font-semibold hover:bg-[#241a12] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText size={14} /> PDF report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
