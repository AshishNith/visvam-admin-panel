import React from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Mail,
  TrendingUp,
  ArrowUpRight,
  MoreVertical,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Product, Order, ContactInquiry } from "../lib/api";

const SALES_DATA = [
  { name: "Mon", revenue: 2400 },
  { name: "Tue", revenue: 3200 },
  { name: "Wed", revenue: 4100 },
  { name: "Thu", revenue: 3800 },
  { name: "Fri", revenue: 5400 },
  { name: "Sat", revenue: 7100 },
  { name: "Sun", revenue: 5800 },
];

interface DashboardPageProps {
  products: Product[];
  orders: Order[];
  inquiries: ContactInquiry[];
}

export default function DashboardPage({ products, orders, inquiries }: DashboardPageProps) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const processingOrders = orders.filter((o) => o.status === "Processing").length;
  const completedOrders = orders.filter((o) => o.status === "Completed").length;
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled").length;
  const totalOrdersCount = orders.length;

  const pendingInquiries = inquiries.filter((i) => i.status === "pending").length;

  // Donut chart data
  const pieData = [
    { name: "Pending", value: pendingOrders || 1, color: "#d97706" },
    { name: "Processing", value: processingOrders, color: "#3b82f6" },
    { name: "Completed", value: completedOrders, color: "#10b981" },
    { name: "Cancelled", value: cancelledOrders, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6 text-[#241a12]">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2">
          <span className="text-xs text-[#6d5c4c] font-medium block">Total Sales</span>
          <p className="font-display font-bold text-2xl sm:text-3xl text-[#241a12]">
            ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
            <span className="flex items-center">↑ 18.4%</span>
            <span className="text-gray-400 font-normal">vs last 7 days</span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2">
          <span className="text-xs text-[#6d5c4c] font-medium block">Total Orders</span>
          <p className="font-display font-bold text-2xl sm:text-3xl text-[#241a12]">
            {totalOrdersCount}
          </p>
          <p className="text-xs text-amber-600 font-medium pt-1">
            {pendingOrders} pending
          </p>
        </div>

        {/* Card 3: Products */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2">
          <span className="text-xs text-[#6d5c4c] font-medium block">Products</span>
          <p className="font-display font-bold text-2xl sm:text-3xl text-[#241a12]">
            {products.length}
          </p>
          <p className="text-xs text-[#6d5c4c] font-medium pt-1">
            Active catalog
          </p>
        </div>

        {/* Card 4: Inquiries */}
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-2">
          <span className="text-xs text-[#6d5c4c] font-medium block">Inquiries</span>
          <p className="font-display font-bold text-2xl sm:text-3xl text-[#241a12]">
            {inquiries.length}
          </p>
          <p className="text-xs text-amber-600 font-medium pt-1">
            {pendingInquiries} unread
          </p>
        </div>
      </div>

      {/* Weekly Sales Performance Chart Card */}
      <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#241a12]/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f8f1e7] text-[#8a4f27] grid place-items-center">
              <TrendingUp size={16} />
            </div>
            <h3 className="font-display font-bold text-lg text-[#241a12]">
              Weekly Sales Performance
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-[#f4ece1]/60 hover:bg-[#eadecc] rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#241a12] transition">
              <span>Live Data</span>
              <ChevronDown size={13} />
            </button>
            <button className="text-gray-400 hover:text-[#241a12] p-1">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SALES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8a4f27" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8a4f27" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(36, 26, 18, 0.08)" />
              <XAxis dataKey="name" stroke="#6d5c4c" fontSize={11} tickLine={false} axisLine={{ stroke: "rgba(36, 26, 18, 0.2)" }} />
              <YAxis
                stroke="#6d5c4c"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val === 0 ? "0" : `${val / 1000}K`)}
              />
              <Tooltip
                formatter={(value: any) => [`₹${value}`, "Revenue"]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "rgba(36, 26, 18, 0.15)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8a4f27"
                strokeWidth={2.5}
                dot={{ fill: "#8a4f27", r: 4 }}
                activeDot={{ r: 6 }}
                fillOpacity={1}
                fill="url(#chartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders + Orders Overview Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Orders Table (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#f8f1e7] text-[#8a4f27] grid place-items-center">
                <ShoppingBag size={16} />
              </div>
              <h3 className="font-display font-bold text-lg text-[#241a12]">Recent Orders</h3>
            </div>
            <Link
              to="/orders"
              className="text-xs text-[#8a4f27] hover:underline font-semibold flex items-center gap-1"
            >
              View All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">ORDER ID</th>
                  <th className="py-3 px-3">CUSTOMER</th>
                  <th className="py-3 px-3">TOTAL</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241a12]/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6d5c4c]">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map((o) => (
                    <tr key={o._id} className="hover:bg-[#faf7f2]/70 transition">
                      <td className="py-3.5 px-3 font-mono text-xs text-[#241a12] font-medium">
                        <Link to={`/orders/${o._id}`} className="hover:underline">
                          {o._id.substring(0, 12)}...
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 text-[#241a12] truncate max-w-[180px]">
                        {o.guestEmail || o.user?.email || "Guest"}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#241a12]">
                        ₹{o.totalPrice ? o.totalPrice.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 text-[9px] font-mono uppercase bg-amber-100 text-amber-800 border border-amber-200/80 rounded font-semibold">
                          {o.status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#6d5c4c] font-mono text-[11px]">
                        {new Date(o.createdAt).toLocaleDateString("en-US")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-[#6d5c4c] pt-2">
            Showing {Math.min(orders.length, 5)} of {orders.length} order{orders.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Right Column: Orders Overview Donut Chart */}
        <div className="bg-white p-6 rounded-xl border border-[#241a12]/10 shadow-2xs flex flex-col justify-between space-y-4">
          <h3 className="font-display font-bold text-lg text-[#241a12] border-b border-[#241a12]/10 pb-4">
            Orders Overview
          </h3>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            {/* Donut chart centered container */}
            <div className="relative w-36 h-36 shrink-0 grid place-items-center">
              <PieChart width={140} height={140}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display font-bold text-2xl text-[#241a12]">
                  {totalOrdersCount}
                </span>
                <span className="text-[10px] text-[#6d5c4c] font-medium">Total</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-2 text-xs flex-1 w-full">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-[#6d5c4c]">Pending</span>
                </span>
                <span className="font-semibold text-[#241a12]">
                  {pendingOrders} ({totalOrdersCount > 0 ? Math.round((pendingOrders / totalOrdersCount) * 100) : 100}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-[#6d5c4c]">Processing</span>
                </span>
                <span className="font-semibold text-[#241a12]">
                  {processingOrders} ({totalOrdersCount > 0 ? Math.round((processingOrders / totalOrdersCount) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[#6d5c4c]">Completed</span>
                </span>
                <span className="font-semibold text-[#241a12]">
                  {completedOrders} ({totalOrdersCount > 0 ? Math.round((completedOrders / totalOrdersCount) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-[#6d5c4c]">Cancelled</span>
                </span>
                <span className="font-semibold text-[#241a12]">
                  {cancelledOrders} ({totalOrdersCount > 0 ? Math.round((cancelledOrders / totalOrdersCount) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
