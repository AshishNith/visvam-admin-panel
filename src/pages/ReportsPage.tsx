import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Users,
  Package,
  FileText,
  Download,
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  Clock,
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
} from "recharts";
import { Product, Order } from "../lib/api";

/* ── Types ──────────────────────────────────────────────── */
type ReportTab = "sales" | "customers" | "inventory" | "tax";
type DateRange = "7d" | "21d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<DateRange, number> = { "7d": 7, "21d": 21, "30d": 30, "90d": 90, all: 9999 };
const RANGE_LABELS: Record<DateRange, string> = { "7d": "7 Days", "21d": "21 Days", "30d": "30 Days", "90d": "90 Days", all: "All Time" };

const CATEGORY_COLORS: Record<string, string> = {
  nuts: "#8a4f27",
  gourmet: "#d97706",
  gifting: "#7c3aed",
};

/* ── CSV Export Helper ──────────────────────────────────── */
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Component ──────────────────────────────────────────── */
interface ReportsPageProps {
  products: Product[];
  orders: Order[];
}

export default function ReportsPage({ products, orders }: ReportsPageProps) {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [range, setRange] = useState<DateRange>("30d");

  const cutoff = new Date(Date.now() - RANGE_DAYS[range] * 86400000);
  const filtered = useMemo(() => orders.filter((o) => new Date(o.createdAt) >= cutoff), [orders, range]);

  const tabs: Array<{ key: ReportTab; label: string; icon: React.ElementType }> = [
    { key: "sales", label: "Sales & Products", icon: BarChart3 },
    { key: "customers", label: "Customers", icon: Users },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "tax", label: "Tax & GST", icon: FileText },
  ];

  return (
    <div className="space-y-6 text-[#241a12]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Comprehensive business analytics</p>
        </div>
        <div className="flex bg-white rounded-lg border border-[#241a12]/10 p-0.5 shadow-2xs">
          {(["7d", "21d", "30d", "90d", "all"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                range === r ? "bg-[#3a2012] text-white shadow-sm" : "text-[#6d5c4c] hover:bg-[#f4ece1]"
              }`}
            >
              {r === "all" ? "All" : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white rounded-lg border border-[#241a12]/10 p-1 shadow-2xs">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all flex-1 justify-center ${
                tab === t.key ? "bg-[#3a2012] text-white shadow-sm" : "text-[#6d5c4c] hover:bg-[#f4ece1]"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs">
        {tab === "sales" && <SalesReport orders={filtered} products={products} range={range} allOrders={orders} />}
        {tab === "customers" && <CustomerReport orders={filtered} range={range} />}
        {tab === "inventory" && <InventoryReport products={products} orders={orders} />}
        {tab === "tax" && <TaxReport orders={filtered} range={range} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. SALES & PRODUCT PERFORMANCE REPORT
   ═══════════════════════════════════════════════════════════ */
function SalesReport({ orders, products, range, allOrders }: { orders: Order[]; products: Product[]; range: DateRange; allOrders: Order[] }) {
  const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalUnits = orders.reduce((s, o) => s + o.orderItems.reduce((ss, i) => ss + i.qty, 0), 0);

  // Daily revenue chart
  const chartData = useMemo(() => {
    const days = Math.min(RANGE_DAYS[range], 90);
    const buckets: Record<string, { revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      buckets[key] = { revenue: 0, orders: 0 };
    }
    for (const o of orders) {
      const key = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (key in buckets) {
        buckets[key].revenue += o.totalPrice || 0;
        buckets[key].orders += 1;
      }
    }
    return Object.entries(buckets).map(([name, d]) => ({ name, revenue: Math.round(d.revenue), orders: d.orders }));
  }, [orders, range]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      for (const item of o.orderItems) {
        const prod = products.find((p) => p.slug === item.slug);
        const cat = prod?.category || "other";
        map[cat] = (map[cat] || 0) + item.price * item.qty;
      }
    }
    const catLabels: Record<string, string> = {
      nuts: "Nuts & Dried Fruits",
      gourmet: "Gourmet Selection",
      gifting: "Gifting & Hampers",
    };
    return Object.entries(map)
      .map(([name, value]) => ({ name: catLabels[name] || name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value), color: CATEGORY_COLORS[name] || "#999" }))
      .sort((a, b) => b.value - a.value);
  }, [orders, products]);

  // Product breakdown table
  const productTable = useMemo(() => {
    const map: Record<string, { name: string; units: number; revenue: number; price: number; category: string }> = {};
    for (const o of orders) {
      for (const item of o.orderItems) {
        if (!map[item.slug]) {
          const prod = products.find((p) => p.slug === item.slug);
          map[item.slug] = { name: item.name, units: 0, revenue: 0, price: item.price, category: prod?.category || "—" };
        }
        map[item.slug].units += item.qty;
        map[item.slug].revenue += item.price * item.qty;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products]);

  const handleExport = () => {
    downloadCSV(
      `visvam_sales_report_${range}.csv`,
      ["Product", "Category", "Unit Price", "Units Sold", "Revenue"],
      productTable.map((p) => [p.name, p.category, `₹${p.price}`, String(p.units), `₹${p.revenue}`])
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`, icon: IndianRupee, color: "emerald" },
          { label: "Orders", value: String(totalOrders), icon: ShoppingBag, color: "blue" },
          { label: "Avg Order Value", value: `₹${aov.toFixed(0)}`, icon: BarChart3, color: "amber" },
          { label: "Units Sold", value: String(totalUnits), icon: Package, color: "purple" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#faf7f2] p-4 rounded-lg space-y-1">
            <p className="text-[10px] text-[#6d5c4c] font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="font-display font-bold text-xl text-[#241a12]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#241a12]">Daily Revenue — {RANGE_LABELS[range]}</h3>
        </div>
        <div className="h-52">
          {chartData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a4f27" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8a4f27" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(36,26,18,0.06)" />
                <XAxis dataKey="name" stroke="#6d5c4c" fontSize={9} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 7))} />
                <YAxis stroke="#6d5c4c" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "rgba(36,26,18,0.12)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#8a4f27" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-[#6d5c4c]">No revenue data for this period</div>
          )}
        </div>
      </div>

      {/* Category Pie + Product Table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Pie */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#241a12]">Revenue by Category</h3>
          {categoryData.length > 0 ? (
            <>
              <div className="flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {categoryData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-semibold font-mono">₹{c.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6d5c4c] py-8 text-center">No data</p>
          )}
        </div>

        {/* Product Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#241a12]">Product Breakdown</h3>
            <button onClick={handleExport} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8a4f27] hover:underline">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 px-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241a12]/5">
                {productTable.map((p, i) => (
                  <tr key={i} className="hover:bg-[#faf7f2]/50">
                    <td className="py-2 px-3 font-medium text-[#241a12] max-w-[160px] truncate">{p.name}</td>
                    <td className="py-2 px-3 capitalize text-[#6d5c4c]">{p.category}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#6d5c4c]">₹{p.price.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-3 text-right font-semibold">{p.units}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700 font-mono">₹{p.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. CUSTOMER INTELLIGENCE REPORT
   ═══════════════════════════════════════════════════════════ */
function CustomerReport({ orders, range }: { orders: Order[]; range: DateRange }) {
  const customerData = useMemo(() => {
    const map: Record<string, { email: string; orders: number; totalSpent: number; firstOrder: Date; lastOrder: Date }> = {};
    for (const o of orders) {
      const email = o.guestEmail || o.user?.email || "guest";
      if (!map[email]) {
        map[email] = { email, orders: 0, totalSpent: 0, firstOrder: new Date(o.createdAt), lastOrder: new Date(o.createdAt) };
      }
      map[email].orders += 1;
      map[email].totalSpent += o.totalPrice || 0;
      const d = new Date(o.createdAt);
      if (d < map[email].firstOrder) map[email].firstOrder = d;
      if (d > map[email].lastOrder) map[email].lastOrder = d;
    }
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const totalCustomers = customerData.length;
  const repeatCustomers = customerData.filter((c) => c.orders > 1).length;
  const newCustomers = totalCustomers - repeatCustomers;
  const avgOrderFreq = totalCustomers > 0 ? (orders.length / totalCustomers).toFixed(1) : "0";
  const topSpender = customerData[0];

  const handleExport = () => {
    downloadCSV(
      `visvam_customers_${range}.csv`,
      ["Customer Email", "Orders", "Total Spent", "First Order", "Last Order"],
      customerData.map((c) => [c.email, String(c.orders), `₹${c.totalSpent.toFixed(0)}`, c.firstOrder.toLocaleDateString("en-IN"), c.lastOrder.toLocaleDateString("en-IN")])
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: String(totalCustomers) },
          { label: "Repeat Customers", value: String(repeatCustomers) },
          { label: "New Customers", value: String(newCustomers) },
          { label: "Avg Order Frequency", value: `${avgOrderFreq}×` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#faf7f2] p-4 rounded-lg space-y-1">
            <p className="text-[10px] text-[#6d5c4c] font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="font-display font-bold text-xl text-[#241a12]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* New vs Repeat Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#241a12]">New vs Repeat</h3>
          <div className="flex justify-center">
            <PieChart width={160} height={160}>
              <Pie
                data={[
                  { name: "New", value: newCustomers || 1, color: "#3b82f6" },
                  { name: "Repeat", value: repeatCustomers, color: "#10b981" },
                ]}
                cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />New</span>
              <span className="font-semibold">{newCustomers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Repeat</span>
              <span className="font-semibold">{repeatCustomers}</span>
            </div>
          </div>
        </div>

        {/* Top Customers Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#241a12]">Top Customers by Spend</h3>
            <button onClick={handleExport} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8a4f27] hover:underline">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3 text-right">Orders</th>
                  <th className="py-2 px-3 text-right">Total Spent</th>
                  <th className="py-2 px-3">Last Order</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241a12]/5">
                {customerData.slice(0, 15).map((c, i) => (
                  <tr key={c.email} className="hover:bg-[#faf7f2]/50">
                    <td className="py-2 px-3 font-mono text-[#6d5c4c]">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-[#241a12] max-w-[180px] truncate">{c.email}</td>
                    <td className="py-2 px-3 text-right font-semibold">{c.orders}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700 font-mono">₹{c.totalSpent.toFixed(0)}</td>
                    <td className="py-2 px-3 text-[#6d5c4c] font-mono text-[10px]">{c.lastOrder.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td className="py-2 px-3">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Hi! Thank you for your order at Viśvam. We have exciting new arrivals!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        WhatsApp →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. INVENTORY & REORDER FORECASTING REPORT
   ═══════════════════════════════════════════════════════════ */
function InventoryReport({ products, orders }: { products: Product[]; orders: Order[] }) {
  const inventoryData = useMemo(() => {
    // Calculate units sold per product in last 30 days for velocity
    const last30 = orders.filter((o) => new Date(o.createdAt) >= new Date(Date.now() - 30 * 86400000));
    const soldMap: Record<string, number> = {};
    for (const o of last30) {
      for (const item of o.orderItems) {
        soldMap[item.slug] = (soldMap[item.slug] || 0) + item.qty;
      }
    }

    return products.map((p) => {
      const stock = p.stock ?? 100;
      const sold30d = soldMap[p.slug] || 0;
      const dailyVelocity = sold30d / 30;
      const daysRemaining = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : 999;
      const stockValue = stock * p.price;
      return { ...p, stock, sold30d, dailyVelocity, daysRemaining, stockValue };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [products, orders]);

  const totalStockValue = inventoryData.reduce((s, p) => s + p.stockValue, 0);
  const lowStockCount = inventoryData.filter((p) => p.stock <= 20).length;
  const totalUnitsInStock = inventoryData.reduce((s, p) => s + p.stock, 0);

  const handleExport = () => {
    downloadCSV(
      "visvam_inventory_report.csv",
      ["Product", "Stock", "Sold (30d)", "Daily Velocity", "Days Remaining", "Stock Value"],
      inventoryData.map((p) => [p.name, String(p.stock), String(p.sold30d), p.dailyVelocity.toFixed(1), String(p.daysRemaining), `₹${p.stockValue}`])
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Stock Value", value: `₹${totalStockValue.toLocaleString("en-IN")}` },
          { label: "Total Units", value: String(totalUnitsInStock) },
          { label: "Products", value: String(products.length) },
          { label: "Low Stock Alerts", value: String(lowStockCount), alert: lowStockCount > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className={`p-4 rounded-lg space-y-1 ${(kpi as any).alert ? "bg-red-50" : "bg-[#faf7f2]"}`}>
            <p className="text-[10px] text-[#6d5c4c] font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className={`font-display font-bold text-xl ${(kpi as any).alert ? "text-red-600" : "text-[#241a12]"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#241a12]">Inventory Status & Reorder Forecast</h3>
        <button onClick={handleExport} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8a4f27] hover:underline">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="py-2.5 px-3">Product</th>
              <th className="py-2.5 px-3 text-right">Current Stock</th>
              <th className="py-2.5 px-3 text-right">Sold (30d)</th>
              <th className="py-2.5 px-3 text-right">Daily Velocity</th>
              <th className="py-2.5 px-3 text-right">Days Left</th>
              <th className="py-2.5 px-3 text-right">Stock Value</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {inventoryData.map((p) => {
              const isLow = p.stock <= 20;
              const isCritical = p.stock <= 5;
              return (
                <tr key={p.slug} className={`hover:bg-[#faf7f2]/50 ${isCritical ? "bg-red-50/50" : ""}`}>
                  <td className="py-2.5 px-3 font-medium text-[#241a12] max-w-[180px] truncate">{p.name}</td>
                  <td className={`py-2.5 px-3 text-right font-semibold ${isLow ? "text-red-600" : "text-[#241a12]"}`}>{p.stock}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#6d5c4c]">{p.sold30d}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#6d5c4c]">{p.dailyVelocity.toFixed(1)}/day</td>
                  <td className={`py-2.5 px-3 text-right font-semibold ${p.daysRemaining <= 14 ? "text-red-600" : p.daysRemaining <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                    {p.daysRemaining >= 999 ? "∞" : `${p.daysRemaining}d`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#6d5c4c]">₹{p.stockValue.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 px-3">
                    {isCritical ? (
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-red-100 text-red-800 rounded font-semibold flex items-center gap-1 w-fit">
                        <AlertTriangle size={10} /> Critical
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-amber-100 text-amber-800 rounded font-semibold">Reorder</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-emerald-100 text-emerald-800 rounded font-semibold">Healthy</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. TAX & GST COMPLIANCE SUMMARY
   ═══════════════════════════════════════════════════════════ */
function TaxReport({ orders, range }: { orders: Order[]; range: DateRange }) {
  const paidOrders = orders.filter((o) => o.isPaid && o.status !== "Cancelled");
  const netTaxableSales = paidOrders.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const totalGST = paidOrders.reduce((s, o) => s + (o.taxPrice || 0), 0);
  const cgst = totalGST / 2;
  const sgst = totalGST / 2;
  const totalShipping = paidOrders.reduce((s, o) => s + (o.shippingPrice || 0), 0);
  const grossRevenue = paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const map: Record<string, { taxable: number; gst: number; orders: number }> = {};
    for (const o of paidOrders) {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      if (!map[key]) map[key] = { taxable: 0, gst: 0, orders: 0 };
      map[key].taxable += o.itemsPrice || 0;
      map[key].gst += o.taxPrice || 0;
      map[key].orders += 1;
    }
    return Object.entries(map).map(([month, d]) => ({ month, ...d }));
  }, [paidOrders]);

  const handleExport = () => {
    downloadCSV(
      `visvam_tax_summary_${range}.csv`,
      ["Month", "Taxable Sales", "CGST (2.5%)", "SGST (2.5%)", "Total GST", "Orders"],
      monthlyData.map((m) => [m.month, `₹${m.taxable.toFixed(2)}`, `₹${(m.gst / 2).toFixed(2)}`, `₹${(m.gst / 2).toFixed(2)}`, `₹${m.gst.toFixed(2)}`, String(m.orders)])
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Net Taxable Sales", value: `₹${netTaxableSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "Total GST Collected", value: `₹${totalGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "CGST (2.5%)", value: `₹${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "SGST (2.5%)", value: `₹${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#faf7f2] p-4 rounded-lg space-y-1">
            <p className="text-[10px] text-[#6d5c4c] font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="font-display font-bold text-lg text-[#241a12]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tax summary card */}
      <div className="bg-[#faf7f2] p-5 rounded-lg space-y-3">
        <h3 className="text-sm font-semibold text-[#241a12]">Tax Filing Summary — {RANGE_LABELS[range]}</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[#6d5c4c]">Gross Revenue</span><span className="font-semibold font-mono">₹{grossRevenue.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[#6d5c4c]">Shipping Revenue</span><span className="font-semibold font-mono">₹{totalShipping.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[#6d5c4c]">Net Taxable Sales</span><span className="font-semibold font-mono">₹{netTaxableSales.toFixed(2)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[#6d5c4c]">CGST @ 2.5%</span><span className="font-semibold font-mono text-amber-700">₹{cgst.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[#6d5c4c]">SGST @ 2.5%</span><span className="font-semibold font-mono text-amber-700">₹{sgst.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-[#241a12]/10 pt-2"><span className="font-semibold text-[#241a12]">Total GST Payable</span><span className="font-bold font-mono text-[#241a12]">₹{totalGST.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#241a12]">Monthly GST Breakdown</h3>
        <button onClick={handleExport} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8a4f27] hover:underline">
          <Download size={12} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Month</th>
              <th className="py-2.5 px-3 text-right">Taxable Sales</th>
              <th className="py-2.5 px-3 text-right">CGST (2.5%)</th>
              <th className="py-2.5 px-3 text-right">SGST (2.5%)</th>
              <th className="py-2.5 px-3 text-right">Total GST</th>
              <th className="py-2.5 px-3 text-right">Paid Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {monthlyData.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#6d5c4c]">No paid orders in this period</td></tr>
            ) : (
              monthlyData.map((m) => (
                <tr key={m.month} className="hover:bg-[#faf7f2]/50">
                  <td className="py-2.5 px-3 font-medium">{m.month}</td>
                  <td className="py-2.5 px-3 text-right font-mono">₹{m.taxable.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">₹{(m.gst / 2).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">₹{(m.gst / 2).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold font-mono">₹{m.gst.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">{m.orders}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Compliance Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><AlertTriangle size={13} /> Compliance Notes</h4>
        <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
          <li>Ensure FSSAI license number is configured in Settings for all product labels</li>
          <li>GSTIN must be displayed on all invoices — configure in Settings → Business Details</li>
          <li>GST rate is currently set to 5% (2.5% CGST + 2.5% SGST) — update in Settings if applicable</li>
          <li>Export this summary for your CA before GST filing deadlines</li>
        </ul>
      </div>
    </div>
  );
}
