import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { Order, updateOrderStatus } from "../lib/api";
import { toast } from "sonner";

interface OrdersPageProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function OrdersPage({ orders, onRefresh }: OrdersPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      (o.guestEmail && o.guestEmail.toLowerCase().includes(search.toLowerCase())) ||
      (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateOrderStatus = async (id: string, status: string, isPaid?: boolean) => {
    const res = await updateOrderStatus(id, status, isPaid);
    if (res.success) {
      toast.success(`Order ${id.substring(0, 8)} status set to ${status}`);
      onRefresh();
    } else {
      toast.error(res.message || "Failed to update order status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d5c4c]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID or Customer Email..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#6d5c4c]">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded border border-[#241a12]/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#241a12]/10 bg-[#faf7f2] font-mono uppercase text-[10px] text-[#6d5c4c]">
            <tr>
              <th className="py-3 px-3">Order ID</th>
              <th className="py-3 px-3">Customer Email</th>
              <th className="py-3 px-3">Harvest Items</th>
              <th className="py-3 px-3">Total</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {filteredOrders.map((o) => (
              <tr key={o._id} className="hover:bg-[#faf7f2]/50 transition">
                <td className="py-3 px-3 font-mono text-[#8a4f27]">
                  <Link to={`/orders/${o._id}`} className="hover:underline font-medium">
                    {o._id}
                  </Link>
                </td>
                <td className="py-3 px-3">{o.guestEmail || o.user?.email || "Guest Customer"}</td>
                <td className="py-3 px-3 max-w-xs text-[11px]">
                  {o.orderItems.map((item, idx) => (
                    <span key={idx} className="block text-[#6d5c4c]">
                      • {item.name} x{item.qty} (₹{item.price})
                    </span>
                  ))}
                </td>
                <td className="py-3 px-3 font-semibold text-[#241a12]">₹{o.totalPrice?.toFixed(2)}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-[#eadecc] text-[#241a12] rounded font-medium">
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => handleUpdateOrderStatus(o._id, o.status, !o.isPaid)}
                    className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded transition ${
                      o.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {o.isPaid ? "Paid ✓" : "Pending"}
                  </button>
                </td>
                <td className="py-3 px-3 text-right">
                  <Link
                    to={`/orders/${o._id}`}
                    className="px-2.5 py-1 bg-[#241a12] text-white hover:bg-[#8a4f27] rounded text-[10px] font-mono uppercase transition inline-flex items-center gap-1"
                  >
                    <Eye size={12} /> Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
