import React, { useState, useEffect, useCallback } from "react";
import { Ticket, Plus, Pencil, Trash2, Check, X, Loader2, BadgePercent } from "lucide-react";
import { toast } from "sonner";
import {
  Coupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../lib/api";

interface CouponForm {
  code: string;
  discountPercent: string;
  active: boolean;
  oncePerCustomer: boolean;
  expiresAt: string; // yyyy-mm-dd, or "" for never
  minOrderValue: string; // "" / "0" = none
  maxRedemptions: string; // "" / "0" = unlimited
}

const EMPTY_FORM: CouponForm = {
  code: "",
  discountPercent: "10",
  active: true,
  oncePerCustomer: false,
  expiresAt: "",
  minOrderValue: "",
  maxRedemptions: "",
};

function toForm(c: Coupon): CouponForm {
  return {
    code: c.code,
    discountPercent: String(c.discountPercent),
    active: c.active,
    oncePerCustomer: c.oncePerCustomer,
    expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : "",
    minOrderValue: c.minOrderValue ? String(c.minOrderValue) : "",
    maxRedemptions: c.maxRedemptions ? String(c.maxRedemptions) : "",
  };
}

/** Build the API payload from the form. Returns a string on validation error. */
function toPayload(f: CouponForm): Partial<Coupon> | string {
  const code = f.code.trim().toUpperCase();
  if (!/^[A-Z0-9._-]{2,32}$/.test(code))
    return "Code must be 2–32 characters — letters, digits, . _ - only.";
  const pct = Math.round(Number(f.discountPercent));
  if (!Number.isFinite(pct) || pct < 1 || pct > 100)
    return "Discount percent must be a whole number between 1 and 100.";

  return {
    code,
    discountPercent: pct,
    active: f.active,
    oncePerCustomer: f.oncePerCustomer,
    // Send the end of the chosen day so a coupon dated today still works today.
    expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : null,
    minOrderValue: Math.max(0, Math.round(Number(f.minOrderValue) || 0)),
    maxRedemptions: Math.max(0, Math.round(Number(f.maxRedemptions) || 0)),
  };
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null + formOpen => creating
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await getCoupons());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c._id);
    setForm(toForm(c));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const payload = toPayload(form);
    if (typeof payload === "string") {
      toast.error(payload);
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await updateCoupon(editingId, payload)
        : await createCoupon(payload);
      if (res.success) {
        toast.success(editingId ? "Coupon updated" : "Coupon created");
        closeForm();
        load();
      } else {
        toast.error(res.message || "Could not save the coupon");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    const res = await updateCoupon(c._id, { active: !c.active });
    if (res.success) {
      setCoupons((prev) => prev.map((x) => (x._id === c._id ? { ...x, active: !c.active } : x)));
    } else {
      toast.error(res.message || "Could not update the coupon");
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    setDeletingId(c._id);
    try {
      const res = await deleteCoupon(c._id);
      if (res.success) {
        toast.success("Coupon deleted");
        setCoupons((prev) => prev.filter((x) => x._id !== c._id));
      } else {
        toast.error(res.message || "Could not delete the coupon");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 text-[#241a12]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-[#f4ece1] text-[#8a4f27]">
            <Ticket size={18} />
          </span>
          <div>
            <h1 className="font-display font-bold text-2xl">Coupons</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Percentage-off codes customers enter at checkout
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#3a2012] hover:bg-[#8a4f27] text-white transition-all shadow-sm"
        >
          <Plus size={14} /> New Coupon
        </button>
      </div>

      {/* Create / edit form */}
      {formOpen && (
        <div className="bg-white rounded-xl border border-[#8a4f27]/30 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? "Edit coupon" : "New coupon"}</h2>
            <button onClick={closeForm} className="text-[#6d5c4c] hover:text-[#241a12]">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Code" hint="What the customer types. Letters, digits, . _ -">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME10"
                className="w-full px-3 py-2 text-xs font-mono bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27] uppercase tracking-wide"
              />
            </Field>
            <Field label="Discount %" hint="Whole number, 1–100. Taken off the items subtotal.">
              <input
                type="number"
                min={1}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27]"
              />
            </Field>
            <Field label="Expires on" hint="Leave blank for no expiry. Works through the end of this day.">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27]"
              />
            </Field>
            <Field label="Minimum order value (₹)" hint="Cart items subtotal must be at least this. Blank / 0 = no minimum.">
              <input
                type="number"
                min={0}
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27]"
              />
            </Field>
            <Field label="Total usage limit" hint="Auto-disables after this many orders. Blank / 0 = unlimited.">
              <input
                type="number"
                min={0}
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27]"
              />
            </Field>
            <div className="flex flex-col justify-center gap-3 pt-1">
              <Toggle
                checked={form.active}
                onChange={(v) => setForm({ ...form, active: v })}
                label="Active (customers can use it)"
              />
              <Toggle
                checked={form.oncePerCustomer}
                onChange={(v) => setForm({ ...form, oncePerCustomer: v })}
                label="One use per customer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#3a2012] hover:bg-[#8a4f27] text-white transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Save changes" : "Create coupon"}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-[#6d5c4c] hover:bg-[#f4ece1] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider border-b border-[#241a12]/10">
              <tr>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Discount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Expires</th>
                <th className="py-2.5 px-3 text-right">Min order</th>
                <th className="py-2.5 px-3 text-right">Used</th>
                <th className="py-2.5 px-3">Per customer</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241a12]/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#6d5c4c]">
                    <Loader2 size={16} className="animate-spin inline" /> Loading coupons…
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#6d5c4c]">
                    No coupons yet. Create one to start offering a discount.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                  const capHit = c.maxRedemptions > 0 && c.timesRedeemed >= c.maxRedemptions;
                  const live = c.active && !expired && !capHit;
                  return (
                    <tr key={c._id} className="hover:bg-[#faf7f2]/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#241a12]">{c.code}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#8a4f27]">
                          <BadgePercent size={12} /> {c.discountPercent}% off
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleToggleActive(c)}
                          title={c.active ? "Click to deactivate" : "Click to activate"}
                          className={`px-2 py-0.5 text-[9px] font-mono font-semibold rounded uppercase ${
                            live
                              ? "bg-emerald-100 text-emerald-800"
                              : c.active
                                ? "bg-amber-100 text-amber-800"
                                : "bg-[#eee] text-[#6d5c4c]"
                          }`}
                        >
                          {c.active ? (expired ? "Expired" : capHit ? "Limit hit" : "Active") : "Off"}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-[#6d5c4c]">{fmtDate(c.expiresAt)}</td>
                      <td className="py-2.5 px-3 text-right text-[#6d5c4c]">
                        {c.minOrderValue ? `₹${c.minOrderValue}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#6d5c4c]">
                        {c.timesRedeemed}
                        {c.maxRedemptions > 0 ? ` / ${c.maxRedemptions}` : ""}
                      </td>
                      <td className="py-2.5 px-3 text-[#6d5c4c]">{c.oncePerCustomer ? "Once" : "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded hover:bg-[#f4ece1] text-[#6d5c4c] hover:text-[#8a4f27] transition"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c._id}
                            className="p-1.5 rounded hover:bg-red-50 text-[#6d5c4c] hover:text-red-600 transition disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === c._id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-[#6d5c4c]/80">
        The discount always comes off the items subtotal. GST is charged on the discounted amount;
        free-delivery eligibility is judged on the pre-discount subtotal.
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-[#6d5c4c] uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#6d5c4c]/70">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  // One <button> is the whole control — no wrapping <label>, which can
  // re-dispatch the click to the switch and make a tap register twice.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 cursor-pointer group text-left"
    >
      <span
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? "bg-emerald-500" : "bg-[#ccc]"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      <span className="text-xs text-[#241a12] group-hover:text-[#8a4f27] transition">
        {label}
        <span className={`ml-1.5 font-semibold ${checked ? "text-emerald-600" : "text-[#9c8c7c]"}`}>
          {checked ? "· ON" : "· OFF"}
        </span>
      </span>
    </button>
  );
}
