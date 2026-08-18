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
  Truck,
  Send,
  Loader2,
  ExternalLink,
  Package,
  FileText,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import {
  Order,
  updateOrderStatus,
  createShiprocketShipment,
  getShiprocketLabel,
  trackOrderShipment,
} from "../lib/api";
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

interface TrackingData {
  awbCode?: string;
  courier?: string;
  currentStatus?: string;
  currentLocation?: string;
  etd?: string;
  timeline?: Array<{ date: string; activity: string; location: string; completed?: boolean }>;
}

export default function OrdersPage({ orders, onRefresh }: OrdersPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("table");

  // Shipping & Tracking Modal state
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  /* ── Filtering ─────────────────────────────────────── */
  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        const matchSearch =
          !search ||
          o._id.toLowerCase().includes(search.toLowerCase()) ||
          (o.guestEmail && o.guestEmail.toLowerCase().includes(search.toLowerCase())) ||
          (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase())) ||
          (o.shiprocket?.awbCode && o.shiprocket.awbCode.toLowerCase().includes(search.toLowerCase()));
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

  /* ── Shiprocket Push / Dispatch ─────────────────────── */
  const handleShipWithShiprocket = async (orderId: string) => {
    setShippingOrderId(orderId);
    try {
      const res = await createShiprocketShipment(orderId);
      if (res.success && res.data) {
        toast.success(res.message || "Order manifested in Shiprocket!");
        onRefresh();
      } else {
        toast.error(res.message || "Failed to ship order via Shiprocket");
      }
    } catch (err: any) {
      toast.error(err.message || "Shiprocket dispatch failed");
    } finally {
      setShippingOrderId(null);
    }
  };

  /* ── Open Live Tracking Modal ───────────────────────── */
  const openTrackingModal = async (order: Order) => {
    setTrackingModalOrder(order);
    setTrackingLoading(true);
    try {
      const target = order.shiprocket?.awbCode || order._id;
      const res = await trackOrderShipment(target);
      if (res.success) {
        setTrackingData(res);
      } else {
        toast.error(res.message || "Could not fetch live tracking");
      }
    } catch (err: any) {
      toast.error("Tracking request failed");
    } finally {
      setTrackingLoading(false);
    }
  };

  /* ── Print Packing Slip ────────────────────────────── */
  const printPackingSlip = (order: Order) => {
    const win = window.open("", "_blank");
    if (!win) return toast.error("Please allow popups to print packing slip");

    const itemsRows = order.orderItems
      .map(
        (i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${i.qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${i.price}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${i.price * i.qty}</td>
      </tr>`
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing Slip - #${order._id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; max-width: 750px; margin: 0 auto; color: #241a12; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3a2012; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #3a2012; }
            .badge { display: inline-block; padding: 3px 8px; background: #eee; border-radius: 4px; font-size: 11px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { text-align: left; background: #faf7f2; padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; text-transform: uppercase; }
            .totals { margin-left: auto; width: 250px; margin-top: 15px; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .grand-total { font-weight: bold; border-top: 1px solid #3a2012; padding-top: 6px; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">VIŚVAM</div>
              <p style="font-size: 11px; color: #6d5c4c; margin: 4px 0 0;">Single-Origin Nuts & Organic Dried Fruits</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px;">PACKING SLIP</h2>
              <p style="font-size: 12px; margin: 4px 0; font-family: monospace;">Order #${order._id}</p>
              <p style="font-size: 11px; color: #6d5c4c; margin: 0;">${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
            <div>
              <strong style="color: #6d5c4c; font-size: 10px; text-transform: uppercase;">Ship To:</strong>
              <p style="margin: 4px 0;"><strong>${order.shippingAddress?.fullName || "Valued Customer"}</strong></p>
              <p style="margin: 2px 0;">${order.shippingAddress?.address || "Address"}</p>
              <p style="margin: 2px 0;">${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""} ${order.shippingAddress?.postalCode || ""}</p>
              <p style="margin: 2px 0;">Phone: ${order.shippingAddress?.phone || "N/A"}</p>
            </div>
            <div style="text-align: right;">
              <strong style="color: #6d5c4c; font-size: 10px; text-transform: uppercase;">Shipment Details:</strong>
              <p style="margin: 4px 0;">Courier: <strong>${order.shiprocket?.courierName || "Shiprocket Express"}</strong></p>
              <p style="margin: 2px 0; font-family: monospace;">AWB: <strong>${order.shiprocket?.awbCode || "Pending"}</strong></p>
              <p style="margin: 2px 0;">Payment: <strong>${order.paymentMethod}</strong> (${order.isPaid ? "PAID" : "COD"})</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Items Subtotal:</span><span>₹${order.itemsPrice?.toFixed(0)}</span></div>
            <div><span>Shipping:</span><span>₹${order.shippingPrice?.toFixed(0)}</span></div>
            <div><span>GST (5%):</span><span>₹${order.taxPrice?.toFixed(0)}</span></div>
            <div class="grand-total"><span>Total Amount:</span><span>₹${order.totalPrice?.toFixed(0)}</span></div>
          </div>

          <div style="margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 15px; font-size: 10px; color: #6d5c4c; text-align: center;">
            Thank you for choosing Viśvam! • Contact: care@visvam.in | +91 98765 43210
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  /* ── Bulk actions ──────────────────────────────────── */
  const bulkUpdateStatus = async (newStatus: string) => {
    let count = 0;
    for (const id of selected) {
      const isPaid = newStatus === "Completed" || newStatus === "Shipped";
      const res = await updateOrderStatus(id, newStatus, isPaid);
      if (res.success) count++;
    }
    toast.success(`Updated ${count} order(s) to ${newStatus}`);
    setSelected(new Set());
    onRefresh();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = search || statusFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ───────────────────────────────────── */}
      <div className="bg-white p-3 rounded-xl border border-[#241a12]/10 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d5c4c]" />
          <input
            type="text"
            placeholder="Search order ID, email, AWB code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-md outline-none focus:border-[#8a4f27] font-mono"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6d5c4c] hover:text-[#241a12]">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Status Filter */}
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

        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-[#faf7f2] p-0.5 rounded-md border border-[#241a12]/10">
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded text-xs transition ${view === "table" ? "bg-white text-[#241a12] shadow-2xs font-semibold" : "text-[#6d5c4c] hover:text-[#241a12]"}`}
            title="Table View"
          >
            <LayoutList size={13} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded text-xs transition ${view === "kanban" ? "bg-white text-[#241a12] shadow-2xs font-semibold" : "text-[#6d5c4c] hover:text-[#241a12]"}`}
            title="Kanban Board"
          >
            <Columns3 size={13} />
          </button>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 font-semibold">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
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
                  <th className="py-2.5 px-3">Shiprocket Fulfillment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
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
                    const isShippedWithSR = Boolean(o.shiprocket?.awbCode);
                    const isDispatching = shippingOrderId === o._id;

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
                          <div>{o.shippingAddress?.fullName || o.guestEmail || o.user?.email || "Customer"}</div>
                          <div className="text-[10px] text-[#6d5c4c] font-mono truncate">{o.guestEmail || o.user?.email || ""}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#6d5c4c]">
                          {o.orderItems.length} item{o.orderItems.length > 1 ? "s" : ""}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold font-mono">₹{o.totalPrice?.toFixed(0)}</td>

                        {/* Shiprocket Fulfillment Column */}
                        <td className="py-2.5 px-3">
                          {isShippedWithSR ? (
                            <div className="space-y-1">
                              <button
                                onClick={() => openTrackingModal(o)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-semibold hover:bg-indigo-100 transition"
                                title="Click to view live tracking"
                              >
                                <Truck size={10} />
                                <span>{o.shiprocket?.awbCode}</span>
                              </button>
                              <div className="text-[9px] text-[#6d5c4c] truncate">{o.shiprocket?.courierName || "Blue Dart Air"}</div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleShipWithShiprocket(o._id)}
                              disabled={isDispatching || o.status === "Cancelled"}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3a2012] hover:bg-[#8a4f27] text-white font-mono text-[9px] font-semibold transition disabled:opacity-50"
                            >
                              {isDispatching ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                              <span>Ship with Shiprocket</span>
                            </button>
                          )}
                        </td>

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

                        {/* Payment */}
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleStatusChange(o._id, o.status)}
                            className={`px-2 py-0.5 text-[9px] font-mono rounded font-semibold ${o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {o.isPaid ? "Paid ✓" : "Unpaid"}
                          </button>
                        </td>

                        {/* Actions */}
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
                <div className={`px-3 py-2.5 border-b border-[#241a12]/10 flex items-center justify-between ${sc.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    <span className={`text-xs font-semibold ${sc.text}`}>{status}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${sc.text}`}>{statusOrders.length}</span>
                </div>
                <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                  {statusOrders.length === 0 ? (
                    <p className="text-[10px] text-[#6d5c4c] text-center py-4">No orders</p>
                  ) : (
                    statusOrders.map((o) => (
                      <div
                        key={o._id}
                        className="p-2.5 rounded-lg border border-[#241a12]/8 hover:border-[#8a4f27]/30 hover:shadow-sm transition group bg-white space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Link to={`/orders/${o._id}`} className="text-[10px] font-mono text-[#8a4f27] font-medium hover:underline">
                            #{o._id.substring(0, 8)}
                          </Link>
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded font-semibold ${o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {o.isPaid ? "Paid" : "Due"}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#241a12] truncate font-medium">
                          {o.shippingAddress?.fullName || o.guestEmail || o.user?.email || "Guest"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#6d5c4c]">{o.orderItems.length} items</span>
                          <span className="text-[10px] font-semibold font-mono text-[#241a12]">₹{o.totalPrice?.toFixed(0)}</span>
                        </div>

                        {/* Shiprocket Kanban Button */}
                        {o.shiprocket?.awbCode ? (
                          <button
                            onClick={() => openTrackingModal(o)}
                            className="w-full text-left text-[9px] font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded flex items-center justify-between border border-indigo-200"
                          >
                            <span>AWB: {o.shiprocket.awbCode}</span>
                            <Truck size={10} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleShipWithShiprocket(o._id)}
                            disabled={shippingOrderId === o._id || o.status === "Cancelled"}
                            className="w-full text-center text-[9px] font-mono font-semibold bg-[#3a2012] text-white py-1 rounded hover:bg-[#8a4f27] transition flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {shippingOrderId === o._id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                            <span>Ship with Shiprocket</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIVE SHIPROCKET TRACKING MODAL ───────────────── */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#241a12]">Live Courier Tracking</h3>
                  <p className="text-[10px] font-mono text-[#6d5c4c]">Order #{trackingModalOrder._id.substring(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTrackingModalOrder(null);
                  setTrackingData(null);
                }}
                className="p-1 rounded-md text-[#6d5c4c] hover:bg-[#faf7f2]"
              >
                <X size={16} />
              </button>
            </div>

            {trackingLoading ? (
              <div className="py-12 text-center text-[#6d5c4c] space-y-2">
                <Loader2 size={24} className="animate-spin mx-auto text-[#8a4f27]" />
                <p className="text-xs">Fetching live status from Shiprocket...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-[#faf7f2] p-3 rounded-xl border border-[#241a12]/8 text-xs">
                  <div>
                    <span className="text-[10px] text-[#6d5c4c] uppercase font-mono">AWB Number</span>
                    <p className="font-mono font-bold text-[#241a12]">{trackingData.awbCode || trackingModalOrder.shiprocket?.awbCode}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6d5c4c] uppercase font-mono">Courier Partner</span>
                    <p className="font-bold text-indigo-700">{trackingData.courier || trackingModalOrder.shiprocket?.courierName || "Blue Dart Air"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6d5c4c] uppercase font-mono">Current Status</span>
                    <p className="font-bold text-emerald-700">{trackingData.currentStatus || "IN TRANSIT"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6d5c4c] uppercase font-mono">Estimated Delivery</span>
                    <p className="font-bold text-[#241a12]">{trackingData.etd || "2–3 Days"}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-[#241a12] uppercase font-mono tracking-wider">Tracking Timeline</h4>
                  <div className="space-y-3 pl-2 border-l-2 border-indigo-200">
                    {(trackingData.timeline || []).map((step, idx) => (
                      <div key={idx} className="relative pl-4 space-y-0.5">
                        <span
                          className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full ${
                            step.completed ? "bg-indigo-600 ring-4 ring-indigo-100" : "bg-slate-300"
                          }`}
                        />
                        <p className={`text-xs font-semibold ${step.completed ? "text-[#241a12]" : "text-[#6d5c4c]"}`}>
                          {step.activity}
                        </p>
                        <p className="text-[10px] text-[#6d5c4c] flex items-center gap-2">
                          <span>{step.date}</span>
                          {step.location && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{step.location}</span>
                            </>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center text-[#6d5c4c] py-6">No tracking updates available yet.</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#241a12]/10">
              <button
                onClick={() => printPackingSlip(trackingModalOrder)}
                className="px-3 py-1.5 text-xs border border-[#241a12]/20 rounded-md font-semibold text-[#241a12] hover:bg-[#faf7f2] transition flex items-center gap-1.5"
              >
                <Printer size={12} />
                <span>Print Packing Slip</span>
              </button>

              <button
                onClick={() => {
                  setTrackingModalOrder(null);
                  setTrackingData(null);
                }}
                className="px-4 py-1.5 text-xs bg-[#3a2012] text-white rounded-md font-semibold hover:bg-[#8a4f27] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
