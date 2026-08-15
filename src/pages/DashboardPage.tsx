import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Clock,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Product, Order, ContactInquiry } from "../lib/api";

/* ── Date range helpers ─────────────────────────────────── */
type DateRange = "7d" | "21d" | "30d" | "90d" | "all";

const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "21d": "Last 21 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All Time",
};

const RANGE_DAYS: Record<DateRange, number> = {
  "7d": 7,
  "21d": 21,
  "30d": 30,
  "90d": 90,
  all: 9999,
};

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000);
}

/* ── Status Colors (consistent across entire admin) ──── */
const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  Processing: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  Shipped: { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  Completed: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  Cancelled: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
};

/* ── Component ──────────────────────────────────────────── */
interface DashboardPageProps {
  products: Product[];
  orders: Order[];
  inquiries: ContactInquiry[];
}

export default function DashboardPage({ products, orders, inquiries }: DashboardPageProps) {
  const [range, setRange] = useState<DateRange>("30d");

  /* ── Filter orders by selected range ──────────────────── */
  const rangeMs = RANGE_DAYS[range] * 86400000;
  const cutoff = new Date(Date.now() - rangeMs);
  const prevCutoff = new Date(cutoff.getTime() - rangeMs);

  const currentOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt) >= cutoff),
    [orders, range]
  );
  const prevOrders = useMemo(
    () =>
      orders.filter(
        (o) => new Date(o.createdAt) >= prevCutoff && new Date(o.createdAt) < cutoff
      ),
    [orders, range]
  );

  /* ── KPI calculations ─────────────────────────────────── */
  const currentRevenue = currentOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const revenueDelta = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : currentRevenue > 0 ? 100 : 0;

  const currentCount = currentOrders.length;
  const prevCount = prevOrders.length;
  const ordersDelta = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : currentCount > 0 ? 100 : 0;

  const currentAOV = currentCount > 0 ? currentRevenue / currentCount : 0;
  const prevAOV = prevCount > 0 ? prevRevenue / prevCount : 0;
  const aovDelta = prevAOV > 0 ? ((currentAOV - prevAOV) / prevAOV) * 100 : currentAOV > 0 ? 100 : 0;

  const currentUnits = currentOrders.reduce(
    (s, o) => s + o.orderItems.reduce((ss, i) => ss + i.qty, 0),
    0
  );
  const prevUnits = prevOrders.reduce(
    (s, o) => s + o.orderItems.reduce((ss, i) => ss + i.qty, 0),
    0
  );
  const unitsDelta = prevUnits > 0 ? ((currentUnits - prevUnits) / prevUnits) * 100 : currentUnits > 0 ? 100 : 0;

  /* ── Status counts ────────────────────────────────────── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Pending: 0, Processing: 0, Shipped: 0, Completed: 0, Cancelled: 0 };
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

  /* ── Low stock ────────────────────────────────────────── */
  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.stock ?? 100) <= 20).sort((a, b) => (a.stock ?? 100) - (b.stock ?? 100)),
    [products]
  );

  /* ── Revenue chart data (group by day) ────────────────── */
  const revenueChartData = useMemo(() => {
    const days = Math.min(RANGE_DAYS[range], 90);
    const buckets: Record<string, number> = {};

    // Pre-fill buckets
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      buckets[key] = 0;
    }

    for (const o of currentOrders) {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (key in buckets) buckets[key] += o.totalPrice || 0;
    }

    return Object.entries(buckets).map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }));
  }, [currentOrders, range]);

  /* ── Product Performance Matrix (Volume × Revenue) ──── */
  const productMatrix = useMemo(() => {
    const map: Record<string, { name: string; units: number; revenue: number; price: number }> = {};
    for (const o of orders) {
      for (const item of o.orderItems) {
        if (!map[item.slug]) {
          map[item.slug] = { name: item.name, units: 0, revenue: 0, price: item.price };
        }
        map[item.slug].units += item.qty;
        map[item.slug].revenue += item.price * item.qty;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  /* ── Activity feed (merged orders + inquiries) ───────── */
  const activityFeed = useMemo(() => {
    const items: Array<{ type: "order" | "inquiry"; label: string; detail: string; time: Date; id: string; status: string }> = [];

    for (const o of orders) {
      items.push({
        type: "order",
        label: `New order from ${o.guestEmail || o.user?.email || "Guest"}`,
        detail: `₹${o.totalPrice?.toFixed(0)} · ${o.orderItems.length} item${o.orderItems.length > 1 ? "s" : ""}`,
        time: new Date(o.createdAt),
        id: o._id,
        status: o.status,
      });
    }
    for (const inq of inquiries) {
      items.push({
        type: "inquiry",
        label: `Inquiry from ${inq.name}`,
        detail: inq.message.substring(0, 80) + (inq.message.length > 80 ? "…" : ""),
        time: new Date(inq.createdAt),
        id: inq._id,
        status: inq.status,
      });
    }

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 12);
  }, [orders, inquiries]);

  /* ── Donut for order status ───────────────────────────── */
  const pieData = [
    { name: "Pending", value: statusCounts.Pending || 0, color: "#d97706" },
    { name: "Processing", value: statusCounts.Processing || 0, color: "#3b82f6" },
    { name: "Shipped", value: statusCounts.Shipped || 0, color: "#6366f1" },
    { name: "Completed", value: statusCounts.Completed || 0, color: "#10b981" },
    { name: "Cancelled", value: statusCounts.Cancelled || 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const totalOrders = orders.length;
  const pendingInquiries = inquiries.filter((i) => i.status === "pending").length;

  /* ── Helpers ──────────────────────────────────────────── */
  function DeltaBadge({ delta }: { delta: number }) {
    const positive = delta >= 0;
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{positive ? "+" : ""}{delta.toFixed(1)}%</span>
        <span className="text-gray-400 font-normal text-[10px]">vs prior {RANGE_LABELS[range].replace("Last ", "")}</span>
      </div>
    );
  }

  function formatCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  }

  function timeAgo(d: Date) {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  /* ── RENDER ───────────────────────────────────────────── */
  return (
    <div className="space-y-6 text-[#241a12]">
      {/* ── Header + Date Range Selector ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#241a12]">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Business performance at a glance</p>
        </div>
        <div className="flex bg-white rounded-lg border border-[#241a12]/10 p-0.5 shadow-2xs">
          {(["7d", "21d", "30d", "90d", "all"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                range === r
                  ? "bg-[#3a2012] text-white shadow-sm"
                  : "text-[#6d5c4c] hover:bg-[#f4ece1]"
              }`}
            >
              {r === "all" ? "All" : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 Comparative KPI Cards ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6d5c4c] font-medium uppercase tracking-wider">Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
              <DollarSign size={14} />
            </div>
          </div>
          <p className="font-display font-bold text-2xl text-[#241a12]">
            ₹{currentRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </p>
          <DeltaBadge delta={revenueDelta} />
        </div>

        {/* Orders */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6d5c4c] font-medium uppercase tracking-wider">Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <ShoppingBag size={14} />
            </div>
          </div>
          <p className="font-display font-bold text-2xl text-[#241a12]">{currentCount}</p>
          <DeltaBadge delta={ordersDelta} />
        </div>

        {/* AOV */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6d5c4c] font-medium uppercase tracking-wider">Avg Order Value</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 grid place-items-center">
              <BarChart3 size={14} />
            </div>
          </div>
          <p className="font-display font-bold text-2xl text-[#241a12]">
            ₹{currentAOV.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </p>
          <DeltaBadge delta={aovDelta} />
        </div>

        {/* Units Sold */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6d5c4c] font-medium uppercase tracking-wider">Units Sold</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 grid place-items-center">
              <Package size={14} />
            </div>
          </div>
          <p className="font-display font-bold text-2xl text-[#241a12]">{currentUnits}</p>
          <DeltaBadge delta={unitsDelta} />
        </div>
      </div>

      {/* ── Revenue Trend Chart ───────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f8f1e7] text-[#8a4f27] grid place-items-center">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#241a12]">Revenue Trend</h3>
              <p className="text-[10px] text-[#6d5c4c]">{RANGE_LABELS[range]} · Real order data</p>
            </div>
          </div>
        </div>

        <div className="h-56 w-full">
          {revenueChartData.length > 0 && revenueChartData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a4f27" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8a4f27" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(36,26,18,0.06)" />
                <XAxis
                  dataKey="name"
                  stroke="#6d5c4c"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(36,26,18,0.15)" }}
                  interval={Math.max(0, Math.floor(revenueChartData.length / 8) - 1)}
                />
                <YAxis
                  stroke="#6d5c4c"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v === 0 ? "0" : `₹${(v / 1000).toFixed(0)}K`)}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderColor: "rgba(36,26,18,0.12)",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8a4f27" strokeWidth={2} dot={false} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-[#6d5c4c]">
              <div className="text-center space-y-1">
                <BarChart3 size={24} className="mx-auto text-[#ccc]" />
                <p>Not enough data yet for this period</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Product Performance Matrix + Order Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Volume vs Revenue — 2 cols */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#241a12]">Product Performance Matrix</h3>
              <p className="text-[10px] text-[#6d5c4c]">Revenue contribution vs units sold — all time</p>
            </div>
          </div>

          {productMatrix.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    <th className="py-2.5 px-3">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241a12]/5">
                  {productMatrix.map((p, i) => {
                    const totalMatrixRev = productMatrix.reduce((s, pp) => s + pp.revenue, 0);
                    const share = totalMatrixRev > 0 ? (p.revenue / totalMatrixRev) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-[#faf7f2]/50">
                        <td className="py-2.5 px-3 font-medium text-[#241a12] max-w-[180px] truncate">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#6d5c4c]">
                          ₹{p.price.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#241a12]">
                          {p.units}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 font-mono">
                          ₹{p.revenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#f4ece1] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#8a4f27] rounded-full transition-all"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[#6d5c4c] w-10 text-right">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#6d5c4c]">No order data available</div>
          )}
        </div>

        {/* Orders Status Donut — 1 col */}
        <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
          <h3 className="font-display font-bold text-base text-[#241a12] border-b border-[#241a12]/10 pb-3">
            Order Status
          </h3>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative w-36 h-36 shrink-0 grid place-items-center">
              {pieData.length > 0 ? (
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={62} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display font-bold text-2xl text-[#241a12]">{totalOrders}</span>
                <span className="text-[10px] text-[#6d5c4c] font-medium">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs w-full">
              {(["Pending", "Processing", "Shipped", "Completed", "Cancelled"] as const).map((st) => {
                const c = statusCounts[st] || 0;
                const pct = totalOrders > 0 ? Math.round((c / totalOrders) * 100) : 0;
                const sc = STATUS_COLOR[st];
                return (
                  <div key={st} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                      <span className="text-[#6d5c4c]">{st}</span>
                    </span>
                    <span className="font-semibold text-[#241a12]">
                      {c} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Low Stock Alert + Activity Feed ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#241a12]/10 pb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 grid place-items-center">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#241a12]">Low Stock Alerts</h3>
              <p className="text-[10px] text-[#6d5c4c]">{lowStockProducts.length} items need restock</p>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-6 text-center text-sm text-emerald-600 flex flex-col items-center gap-1">
              <Package size={20} className="text-emerald-400" />
              <p>All products well stocked</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {lowStockProducts.map((p) => (
                <Link
                  key={p.slug}
                  to={`/products/${p._id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/50 hover:bg-red-50 transition group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#241a12] truncate">{p.name}</p>
                    <p className="text-[10px] text-red-600 font-semibold">{p.stock ?? 0} units left</p>
                  </div>
                  <ChevronRight size={14} className="text-[#ccc] group-hover:text-[#8a4f27] transition shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Unified Activity Feed — 2 cols */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#f8f1e7] text-[#8a4f27] grid place-items-center">
                <Activity size={16} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#241a12]">Activity Feed</h3>
                <p className="text-[10px] text-[#6d5c4c]">Orders & inquiries combined</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/orders" className="text-[10px] text-[#8a4f27] hover:underline font-semibold">
                All Orders →
              </Link>
              <Link to="/inquiries" className="text-[10px] text-[#8a4f27] hover:underline font-semibold">
                All Inquiries →
              </Link>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {activityFeed.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6d5c4c]">No activity yet</div>
            ) : (
              activityFeed.map((item, idx) => {
                const sc =
                  item.type === "order"
                    ? STATUS_COLOR[item.status] || STATUS_COLOR.Pending
                    : item.status === "resolved"
                    ? STATUS_COLOR.Completed
                    : item.status === "reviewed"
                    ? STATUS_COLOR.Processing
                    : STATUS_COLOR.Pending;
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.type === "order" ? `/orders/${item.id}` : "/inquiries"}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#faf7f2] transition group"
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[10px] font-bold ${sc.bg} ${sc.text} mt-0.5`}>
                      {item.type === "order" ? <ShoppingBag size={12} /> : <Mail size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#241a12] truncate">{item.label}</p>
                      <p className="text-[10px] text-[#6d5c4c] truncate">{item.detail}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-semibold ${sc.bg} ${sc.text}`}>
                        {item.status}
                      </span>
                      <p className="text-[9px] text-[#6d5c4c] flex items-center gap-0.5 justify-end">
                        <Clock size={9} />
                        {timeAgo(item.time)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Orders Table ────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f8f1e7] text-[#8a4f27] grid place-items-center">
              <ShoppingBag size={16} />
            </div>
            <h3 className="font-display font-bold text-base text-[#241a12]">Recent Orders</h3>
          </div>
          <Link to="/orders" className="text-xs text-[#8a4f27] hover:underline font-semibold flex items-center gap-1">
            View All Orders <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241a12]/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6d5c4c]">No orders placed yet</td>
                </tr>
              ) : (
                orders
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 8)
                  .map((o) => {
                    const sc = STATUS_COLOR[o.status] || STATUS_COLOR.Pending;
                    return (
                      <tr key={o._id} className="hover:bg-[#faf7f2]/50 transition">
                        <td className="py-2.5 px-3 font-mono text-[#8a4f27] font-medium">
                          <Link to={`/orders/${o._id}`} className="hover:underline">
                            #{o._id.substring(0, 8)}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-[#241a12] truncate max-w-[150px]">
                          {o.guestEmail || o.user?.email || "Guest"}
                        </td>
                        <td className="py-2.5 px-3 text-[#6d5c4c]">
                          {o.orderItems.length} item{o.orderItems.length > 1 ? "s" : ""}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#241a12] font-mono">
                          ₹{o.totalPrice?.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded font-semibold ${sc.bg} ${sc.text}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-semibold ${o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {o.isPaid ? "Paid ✓" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#6d5c4c] font-mono text-[10px]">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
