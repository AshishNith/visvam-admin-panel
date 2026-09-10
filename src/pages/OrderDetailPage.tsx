import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Store } from "lucide-react";
import { Order, updateOrderStatus, orderItemPackLabel, displayOrderNumber } from "../lib/api";
import { toast } from "sonner";

interface OrderDetailPageProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function OrderDetailPage({ orders, onRefresh }: OrderDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) {
      const found = orders.find((o) => o._id === id);
      if (found) setOrder(found);
    }
  }, [id, orders]);

  if (!order) {
    return (
      <div className="space-y-4">
        <Link to="/orders" className="text-xs font-mono text-[#8a4f27] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
        <div className="bg-white p-8 rounded border border-[#241a12]/10 text-center text-xs text-[#6d5c4c]">
          Order not found or loading...
        </div>
      </div>
    );
  }

  // Fulfilment status only — `isPaid` is omitted so the server leaves the
  // payment record alone. Shipping a COD parcel does not mean it is paid for.
  const handleStatusChange = async (newStatus: string) => {
    const res = await updateOrderStatus(order._id, newStatus);
    if (res.success) {
      toast.success(`Order status updated to ${newStatus}`);
      setOrder({ ...order, status: newStatus as any });
      onRefresh();
    } else {
      toast.error(res.message || "Failed to update order status");
    }
  };

  // Money actually changing hands is its own deliberate, confirmed action.
  const handlePaymentToggle = async () => {
    const next = !order.isPaid;
    const amount = `₹${order.totalPrice?.toFixed(0)}`;
    const collectedWhere =
      order.fulfillmentMethod === "pickup" ? "collected at the counter" : "collected on delivery";
    const ok = window.confirm(
      next
        ? `Mark this order as PAID?\n\n${amount} — only confirm this once the money has actually been ${collectedWhere}.`
        : `Mark this order as UNPAID?\n\nThis reverses the payment record for ${amount}.`
    );
    if (!ok) return;

    const res = await updateOrderStatus(order._id, order.status, next);
    if (res.success) {
      toast.success(`Payment status marked as ${next ? "Paid" : "Pending"}`);
      setOrder({ ...order, isPaid: next });
      onRefresh();
    } else {
      toast.error(res.message || "Failed to update payment status");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 bg-white border border-[#241a12]/15 hover:bg-[#eadecc] rounded transition text-[#241a12]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <span className="text-[10px] font-mono text-[#8a4f27] uppercase">
              Order {displayOrderNumber(order)}
            </span>
            <h1 className="font-display italic text-2xl text-[#241a12]">Customer Order Breakdown</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-white border border-[#241a12]/20 text-xs px-3 py-1.5 rounded outline-none font-mono font-medium text-[#241a12]"
          >
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {order.fulfillmentMethod === "pickup" && (
        <div className="flex items-start gap-3 bg-clay text-white p-4 rounded-lg">
          <Store size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm uppercase tracking-wide">Warehouse Pickup — customer collects in person</p>
            <p className="text-white/85 text-xs mt-0.5">
              Do not ship this order or push it to Shiprocket. Pack it and hold it at the Sector 63 counter.
              {!order.isPaid && " Payment is due on collection."}
            </p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-5 rounded border border-[#241a12]/10">
        <div className="space-y-1">
          <p className="font-mono text-[#8a4f27] font-semibold text-[10px] uppercase">Customer Contact</p>
          <p className="font-medium text-[#241a12]">
            {order.shippingAddress?.fullName || order.user?.name || "Guest Customer"}
          </p>
          <p className="text-[#6d5c4c]">{order.guestEmail || order.user?.email || order.shippingAddress?.email || "No Email Provided"}</p>
          <p className="text-[#241a12]">
            Phone:{" "}
            <a
              href={order.shippingAddress?.phone ? `tel:${order.shippingAddress.phone}` : undefined}
              className="font-mono font-semibold text-[#8a4f27] hover:underline"
            >
              {order.shippingAddress?.phone || "Not provided"}
            </a>
          </p>
          <p className="text-[#6d5c4c] font-mono text-[11px]">Placed: {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        <div className="space-y-1">
          <p className="font-mono text-[#8a4f27] font-semibold text-[10px] uppercase">Fulfilment & Payment</p>
          {order.fulfillmentMethod === "pickup" ? (
            <>
              <p className="text-[#8a4f27] font-semibold">🏬 Store Pickup — customer collects in person</p>
              <p className="text-[#6d5c4c]">No courier · not sent to Shiprocket</p>
              <p className="text-[#241a12]">Collecting: <span className="font-mono">{order.shippingAddress?.fullName || "—"}</span></p>
              <p className="text-[#241a12]">Phone: <span className="font-mono">{order.shippingAddress?.phone || "—"}</span></p>
            </>
          ) : (
            <p className="text-[#241a12]">Method: <span className="font-mono">Courier delivery</span></p>
          )}
          <p className="text-[#241a12]">Payment Method: <span className="font-mono">{order.paymentMethod}</span></p>
        </div>
      </div>

      {/* Delivery Address — the address & phone the customer entered at checkout */}
      {order.fulfillmentMethod !== "pickup" && (
        <div className="bg-white p-5 rounded border border-[#241a12]/10 space-y-1 text-xs">
          <p className="font-mono text-[#8a4f27] font-semibold text-[10px] uppercase">Delivery Address</p>
          {order.shippingAddress ? (
            <>
              <p className="font-medium text-[#241a12]">{order.shippingAddress.fullName || "—"}</p>
              {order.shippingAddress.address && (
                <p className="text-[#6d5c4c]">{order.shippingAddress.address}</p>
              )}
              <p className="text-[#6d5c4c]">
                {[
                  order.shippingAddress.city,
                  order.shippingAddress.state,
                  order.shippingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
                {order.shippingAddress.country ? ` · ${order.shippingAddress.country}` : ""}
              </p>
              <p className="text-[#241a12] pt-1">
                Phone:{" "}
                <a
                  href={order.shippingAddress.phone ? `tel:${order.shippingAddress.phone}` : undefined}
                  className="font-mono font-semibold text-[#8a4f27] hover:underline"
                >
                  {order.shippingAddress.phone || "Not provided"}
                </a>
              </p>
              {order.shippingAddress.email && (
                <p className="text-[#6d5c4c]">Email: <span className="font-mono">{order.shippingAddress.email}</span></p>
              )}
            </>
          ) : (
            <p className="text-[#6d5c4c] italic">No delivery address on this order.</p>
          )}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white p-5 rounded border border-[#241a12]/10 space-y-3">
        <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">
          Ordered Items ({order.orderItems?.length || 0})
        </h3>
        <div className="border border-[#241a12]/10 rounded overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Item</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5">Price</th>
                <th className="p-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241a12]/5">
              {order.orderItems.map((item, idx) => {
                const pack = orderItemPackLabel(item);
                return (
                <tr key={idx}>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2.5">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="size-9 object-cover rounded bg-[#faf7f2] border border-[#241a12]/10" />
                      )}
                      <div className="space-y-1">
                        <span className="font-medium text-[#241a12]">{item.name}</span>
                        {pack ? (
                          <span className="block w-fit px-2 py-0.5 rounded bg-[#8a4f27]/10 text-[#8a4f27] text-[11px] font-mono font-semibold uppercase tracking-wide">
                            {pack}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-[#6d5c4c] italic">
                            pack size not recorded
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 font-mono">x{item.qty}</td>
                  <td className="p-2.5 font-mono">₹{item.price?.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono font-semibold">
                    ₹{(item.qty * item.price).toFixed(2)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white p-5 rounded border border-[#241a12]/10 flex justify-between items-center text-xs">
        <div className="space-y-1 text-[#6d5c4c]">
          <p>Subtotal: ₹{order.itemsPrice?.toFixed(2)}</p>
          {Boolean(order.discountAmount) && (
            <p className="text-emerald-700">
              Discount{order.couponCode ? ` (${order.couponCode})` : ""}: −₹{order.discountAmount!.toFixed(2)}
            </p>
          )}
          <p>Tax (5%): ₹{order.taxPrice?.toFixed(2)}</p>
          <p>Shipping: ₹{order.shippingPrice?.toFixed(2)}</p>
          {Boolean(order.codFee) && <p>COD handling fee: ₹{order.codFee!.toFixed(2)}</p>}
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono uppercase text-[#6d5c4c]">Total Amount</span>
          <p className="font-display italic text-3xl text-[#8a4f27]">
            ₹{order.totalPrice?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payment Toggle */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handlePaymentToggle}
          className={`px-4 py-2 text-xs font-mono uppercase rounded transition font-semibold ${
            order.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {order.isPaid ? "Payment Verified (Paid ✓)" : "Payment Pending (Click to Mark Paid)"}
        </button>

        <Link
          to="/orders"
          className="px-4 py-2 bg-[#241a12] text-white rounded text-xs font-mono uppercase"
        >
          Back to All Orders
        </Link>
      </div>
    </div>
  );
}
