import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Eye,
  ChevronDown,
  CheckSquare,
  Square,
  Printer,
  Trash2,
  ArrowUpRight,
  Calendar,
  Filter,
  X,
  LayoutList,
  Columns3,
} from "lucide-react";
import { Order, updateOrderStatus } from "../lib/api";
import { toast } from "sonner";

/* ── Status visual config ──────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  Processing: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  Shipped: { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  Completed: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  Cancelled: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
};
const ALL_STATUSES = ["Pending", "Processing", "Shipped", "Completed", "Cancelled"];
const PAYMENT_FILTERS = ["all", "paid", "unpaid"];

type ViewMode = "table" | "kanban";

interface OrdersPageProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function OrdersPage({ orders, onRefresh }: OrdersPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("table");

  /* ── Filtering ─────────────────────────────────────── */
  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        const matchSearch =
          !search ||
          o._id.toLowerCase().includes(search.toLowerCase()) ||
          (o.guestEmail && o.guestEmail.toLowerCase().includes(search.toLowerCase())) ||
          (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = statusFilter === "all" || o.status === statusFilter;
        const matchPayment =
          paymentFilter === "all" ||
          (paymentFilter === "paid" && o.isPaid) ||
          (paymentFilter === "unpaid" && !o.isPaid);
        let matchDate = true;
        if (dateFrom) matchDate = matchDate && new Date(o.createdAt) >= new Date(dateFrom);
        if (dateTo) matchDate = matchDate && new Date(o.createdAt) <= new Date(dateTo + "T23:59:59");
        return matchSearch && matchStatus && matchPayment && matchDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter, paymentFilter, dateFrom, dateTo]);

  /* ── Selection helpers ─────────────────────────────── */
  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o._id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((o) => o._id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  /* ── Inline status update ──────────────────────────── */
  const handleStatusChange = async (id: string, newStatus: string) => {
    const isPaid = newStatus === "Completed" || newStatus === "Shipped";
    const res = await updateOrderStatus(id, newStatus, isPaid);
    if (res.success) {
      toast.success(`Order #${id.substring(0, 8)} → ${newStatus}`);
      onRefresh();
    } else {
      toast.error(res.message || "Failed to update");
    }
  };

  /* ── Bulk actions ──────────────────────────────────── */
  const bulkUpdateStatus = async (newStatus: string) => {
    let count = 0;
    for (const id of selected) {
      const isPaid = newStatus === "Completed" || newStatus === "Shipped";
      const res = await updateOrderStatus(id, newStatus, isPaid);
      if (res.success) count++;
    }
    toast.success(`${count} orders updated to ${newStatus}`);
    setSelected(new Set());
    onRefresh();
  };

  /* ── Print packing slip ────────────────────────────── */
  const printPackingSlip = (order: Order) => {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
      <head><title>Packing Slip — #${order._id.substring(0, 8)}</title>
      <style>body{font-family:monospace;font-size:12px;padding:20px}h2{margin:0 0 10px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f5f5f5}</style>
      </head>
      <body>
        <h2>Viśvam — Packing Slip</h2>
        <p><strong>Order:</strong> #${order._id.substring(0, 12)}</p>
        <p><strong>Customer:</strong> ${order.guestEmail || order.user?.email || "Guest"}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
        <hr/>
        <table>
          <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
          ${order.orderItems.map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.price}</td></tr>`).join("")}
        </table>
        <hr/>
        <p><strong>Total:</strong> ₹${order.totalPrice?.toFixed(2)}</p>
        <p><strong>Payment:</strong> ${order.isPaid ? "Paid ✓" : "Unpaid"}</p>
        <p style="margin-top:20px;font-size:10px;color:#999">Generated ${new Date().toLocaleString("en-IN")}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const hasActiveFilters = statusFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo;
  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  /* ── RENDER ────────────────────────────────────────── */
  return (
    <div className="space-y-4 text-[#241a12]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {orders.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-[#241a12]/10 p-0.5 shadow-2xs">
          <button
            onClick={() => setView("table")}
            className={`p-2 rounded-md transition ${view === "table" ? "bg-[#3a2012] text-white" : "text-[#6d5c4c] hover:bg-[#f4ece1]"}`}
            title="Table View"
          >
            <LayoutList size={14} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`p-2 rounded-md transition ${view === "kanban" ? "bg-[#3a2012] text-white" : "text-[#6d5c4c] hover:bg-[#f4ece1]"}`}
            title="Kanban Board"
          >
            <Columns3 size={14} />
          </button>
        </div>
      </div>

      {/* Combined Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border border-[#241a12]/10 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6d5c4c]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or email…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] transition"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-2.5 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] font-mono"
        >
          <option value="all">All Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Payment */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="py-1.5 px-2.5 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] font-mono"
        >
          <option value="all">All Payment</option>
          <option value="paid">Paid ✓</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-[#6d5c4c]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="py-1.5 px-2 text-[10px] bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] font-mono"
          />
          <span className="text-[10px] text-[#6d5c4c]">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="py-1.5 px-2 text-[10px] bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] font-mono"
          />
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 font-semibold">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Bulk Actions Bar (visible when items selected) */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#3a2012] text-white p-3 rounded-lg shadow-sm animate-in slide-in-from-top-2">
          <span className="text-xs font-semibold">{selected.size} selected</span>
          <div className="h-4 w-px bg-white/20" />
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => bulkUpdateStatus(s)}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-white/10 hover:bg-white/20 transition"
            >
              → {s}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="text-[10px] text-white/60 hover:text-white transition">
            Deselect All
          </button>
        </div>
      )}

      {/* ── TABLE VIEW ──────────────────────────────────── */}
      {view === "table" && (
        <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider border-b border-[#241a12]/10">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button onClick={toggleSelectAll} className="text-[#6d5c4c] hover:text-[#241a12]">
                      {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241a12]/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#6d5c4c]">No orders match your filters</td>
                  </tr>
                ) : (
                  filtered.map((o) => {
                    const sc = STATUS_CFG[o.status] || STATUS_CFG.Pending;
                    return (
                      <tr key={o._id} className={`hover:bg-[#faf7f2]/50 transition ${selected.has(o._id) ? "bg-blue-50/30" : ""}`}>
                        <td className="py-2.5 px-3">
                          <button onClick={() => toggleOne(o._id)} className="text-[#6d5c4c] hover:text-[#241a12]">
                            {selected.has(o._id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#8a4f27] font-medium">
                          <Link to={`/orders/${o._id}`} className="hover:underline">#{o._id.substring(0, 8)}</Link>
                        </td>
                        <td className="py-2.5 px-3 text-[#241a12] truncate max-w-[140px]">
                          {o.guestEmail || o.user?.email || "Guest"}
                        </td>
                        <td className="py-2.5 px-3 text-[#6d5c4c]">
                          {o.orderItems.length} item{o.orderItems.length > 1 ? "s" : ""}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold font-mono">₹{o.totalPrice?.toFixed(0)}</td>
                        {/* Inline Status Dropdown */}
                        <td className="py-2.5 px-3">
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                            className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded font-semibold border-0 outline-none cursor-pointer ${sc.bg} ${sc.text}`}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleStatusChange(o._id, o.status)}
                            className={`px-2 py-0.5 text-[9px] font-mono rounded font-semibold ${o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {o.isPaid ? "Paid ✓" : "Unpaid"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-[#6d5c4c]">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => printPackingSlip(o)}
                              className="p-1.5 rounded hover:bg-[#f4ece1] text-[#6d5c4c] hover:text-[#241a12] transition"
                              title="Print Packing Slip"
                            >
                              <Printer size={13} />
                            </button>
                            <Link
                              to={`/orders/${o._id}`}
                              className="p-1.5 rounded hover:bg-[#f4ece1] text-[#6d5c4c] hover:text-[#8a4f27] transition"
                              title="View Details"
                            >
                              <Eye size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-[#241a12]/10 text-[10px] text-[#6d5c4c] text-center">
            Showing {filtered.length} of {orders.length} orders
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ─────────────────────────────────── */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ALL_STATUSES.map((status) => {
            const sc = STATUS_CFG[status];
            const statusOrders = filtered.filter((o) => o.status === status);
            return (
              <div key={status} className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs overflow-hidden">
                {/* Column header */}
                <div className={`px-3 py-2.5 border-b border-[#241a12]/10 flex items-center justify-between ${sc.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    <span className={`text-xs font-semibold ${sc.text}`}>{status}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${sc.text}`}>{statusOrders.length}</span>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                  {statusOrders.length === 0 ? (
                    <p className="text-[10px] text-[#6d5c4c] text-center py-4">No orders</p>
                  ) : (
                    statusOrders.map((o) => (
                      <Link
                        key={o._id}
                        to={`/orders/${o._id}`}
                        className="block p-2.5 rounded-lg border border-[#241a12]/8 hover:border-[#8a4f27]/30 hover:shadow-sm transition group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#8a4f27] font-medium">#{o._id.substring(0, 8)}</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded font-semibold ${o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {o.isPaid ? "Paid" : "Due"}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#241a12] mt-1 truncate font-medium">
                          {o.guestEmail || o.user?.email || "Guest"}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[#6d5c4c]">{o.orderItems.length} items</span>
                          <span className="text-[10px] font-semibold font-mono text-[#241a12]">₹{o.totalPrice?.toFixed(0)}</span>
                        </div>
                        <p className="text-[9px] text-[#6d5c4c] font-mono mt-1">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
