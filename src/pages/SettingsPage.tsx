import React, { useState, useEffect } from "react";
import { Store, CreditCard, Tag, Users, Save, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/* ── LocalStorage persistence ──────────────────────────── */
const SETTINGS_KEY = "visvam_admin_settings_v1";

interface StoreSettings {
  // Business Details
  storeName: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fssaiNumber: string;
  gstin: string;
  phone: string;
  email: string;

  // Commerce Config
  taxRate: number;
  freeShippingThreshold: number;
  flatShippingRate: number;
  enableCOD: boolean;
  enableUPI: boolean;
  enableCard: boolean;
  enableNetBanking: boolean;
  pickupLanes: string;
  pickupSlots: string;

  // Catalog
  categories: string;
  badges: string;

  // Team
  roles: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Viśvam",
  legalName: "Visvam Private Limited",
  address: "The Orchard Estate, Riverside Lane",
  city: "Dehradun",
  state: "Uttarakhand",
  pincode: "248001",
  fssaiNumber: "",
  gstin: "",
  phone: "+91 98765 43210",
  email: "care@visvam.in",

  taxRate: 5,
  freeShippingThreshold: 1500,
  flatShippingRate: 99,
  enableCOD: true,
  enableUPI: true,
  enableCard: true,
  enableNetBanking: true,
  pickupLanes: "Riverside Lane\nOrchard Gate\nHeritage Lounge",
  pickupSlots: "ASAP\n10:00 AM - 12:00 PM\n2:00 PM - 4:00 PM\n5:00 PM - 7:00 PM",

  categories: "nuts: Nuts & Dried Fruits\ngourmet: Gourmet Selection\ngifting: Gifting & Hampers",
  badges: "SUPERFOOD\nLUXURY EDITION\nBEST SELLER\nNEW ARRIVAL\nLIMITED EDITION\nORGANIC",

  roles: "Admin: Full access to all features\nStore Manager: Products, Orders, Reports\nDispatch Staff: Orders only (view & status)\nRead-Only: Dashboard & Reports view",
};

function loadSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: StoreSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ── Component ──────────────────────────────────────────── */
type SettingsTab = "business" | "commerce" | "catalog" | "team";

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("business");
  const [settings, setSettings] = useState<StoreSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    toast.success("Settings saved successfully");
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: keyof StoreSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const tabs: Array<{ key: SettingsTab; label: string; icon: React.ElementType }> = [
    { key: "business", label: "Business Details", icon: Store },
    { key: "commerce", label: "Commerce Config", icon: CreditCard },
    { key: "catalog", label: "Catalog", icon: Tag },
    { key: "team", label: "Team & Access", icon: Users },
  ];

  return (
    <div className="space-y-6 text-[#241a12]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Store configuration & compliance</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-[#3a2012] hover:bg-[#8a4f27] text-white"
          }`}
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
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

      {/* Settings Content */}
      <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs p-6">
        {tab === "business" && <BusinessSettings settings={settings} update={update} />}
        {tab === "commerce" && <CommerceSettings settings={settings} update={update} />}
        {tab === "catalog" && <CatalogSettings settings={settings} update={update} />}
        {tab === "team" && <TeamSettings settings={settings} update={update} />}
      </div>
    </div>
  );
}

/* ── Shared Input Components ───────────────────────────── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-[#6d5c4c] uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#6d5c4c]/70">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27] focus:ring-1 focus:ring-[#8a4f27]/20 transition"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27] focus:ring-1 focus:ring-[#8a4f27]/20 transition resize-none font-mono"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-emerald-500" : "bg-[#ccc]"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <span className="text-xs text-[#241a12] group-hover:text-[#8a4f27] transition">{label}</span>
    </label>
  );
}

/* ── 1. Business Details ───────────────────────────────── */
function BusinessSettings({ settings, update }: { settings: StoreSettings; update: (k: keyof StoreSettings, v: any) => void }) {
  const missingFSSAI = !settings.fssaiNumber.trim();
  const missingGSTIN = !settings.gstin.trim();

  return (
    <div className="space-y-6">
      {(missingFSSAI || missingGSTIN) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-700 space-y-1">
            <p className="font-semibold">Compliance Gaps Detected</p>
            {missingFSSAI && <p>• FSSAI License Number is missing — required on all food product labels</p>}
            {missingGSTIN && <p>• GSTIN is missing — required on all tax invoices</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Store Name"><Input value={settings.storeName} onChange={(v) => update("storeName", v)} /></Field>
        <Field label="Registered Legal Name"><Input value={settings.legalName} onChange={(v) => update("legalName", v)} /></Field>
        <Field label="Address"><Input value={settings.address} onChange={(v) => update("address", v)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><Input value={settings.city} onChange={(v) => update("city", v)} /></Field>
          <Field label="State"><Input value={settings.state} onChange={(v) => update("state", v)} /></Field>
          <Field label="PIN Code"><Input value={settings.pincode} onChange={(v) => update("pincode", v)} /></Field>
        </div>
        <Field label="Phone"><Input value={settings.phone} onChange={(v) => update("phone", v)} /></Field>
        <Field label="Email"><Input value={settings.email} onChange={(v) => update("email", v)} type="email" /></Field>
        <Field label="FSSAI License Number" hint="14-digit FSSAI number — mandatory for all packaged food products">
          <Input value={settings.fssaiNumber} onChange={(v) => update("fssaiNumber", v)} placeholder="e.g. 12345678901234" />
        </Field>
        <Field label="GSTIN" hint="15-character GST Identification Number — displayed on all invoices">
          <Input value={settings.gstin} onChange={(v) => update("gstin", v)} placeholder="e.g. 05AAACH0036Q1Z4" />
        </Field>
      </div>
    </div>
  );
}

/* ── 2. Commerce Config ────────────────────────────────── */
function CommerceSettings({ settings, update }: { settings: StoreSettings; update: (k: keyof StoreSettings, v: any) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-[#241a12] border-b border-[#241a12]/10 pb-2">Tax & Shipping</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="GST Rate (%)" hint="Applied as CGST + SGST split equally">
          <Input value={String(settings.taxRate)} onChange={(v) => update("taxRate", Number(v) || 0)} type="number" />
        </Field>
        <Field label="Free Shipping Above (₹)" hint="Orders above this amount get free shipping">
          <Input value={String(settings.freeShippingThreshold)} onChange={(v) => update("freeShippingThreshold", Number(v) || 0)} type="number" />
        </Field>
        <Field label="Flat Shipping Rate (₹)" hint="Applied when order total is below free shipping threshold">
          <Input value={String(settings.flatShippingRate)} onChange={(v) => update("flatShippingRate", Number(v) || 0)} type="number" />
        </Field>
      </div>

      <h3 className="text-sm font-semibold text-[#241a12] border-b border-[#241a12]/10 pb-2 pt-2">Payment Methods</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Toggle checked={settings.enableCard} onChange={(v) => update("enableCard", v)} label="Card Payments" />
        <Toggle checked={settings.enableUPI} onChange={(v) => update("enableUPI", v)} label="UPI / QR Pay" />
        <Toggle checked={settings.enableCOD} onChange={(v) => update("enableCOD", v)} label="Cash on Delivery" />
        <Toggle checked={settings.enableNetBanking} onChange={(v) => update("enableNetBanking", v)} label="Net Banking" />
      </div>

      <h3 className="text-sm font-semibold text-[#241a12] border-b border-[#241a12]/10 pb-2 pt-2">Pickup / Delivery Lanes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Pickup Lanes" hint="One per line">
          <TextArea value={settings.pickupLanes} onChange={(v) => update("pickupLanes", v)} />
        </Field>
        <Field label="Time Slots" hint="One per line">
          <TextArea value={settings.pickupSlots} onChange={(v) => update("pickupSlots", v)} />
        </Field>
      </div>
    </div>
  );
}

/* ── 3. Catalog Config ─────────────────────────────────── */
function CatalogSettings({ settings, update }: { settings: StoreSettings; update: (k: keyof StoreSettings, v: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Categories" hint="Format: slug: Display Name (one per line)">
          <TextArea value={settings.categories} onChange={(v) => update("categories", v)} rows={5} />
        </Field>
        <div className="space-y-3">
          <Field label="Product Badges / Tags" hint="One badge per line — used across the catalog">
            <TextArea value={settings.badges} onChange={(v) => update("badges", v)} rows={5} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {settings.badges.split("\n").filter(Boolean).map((b, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#f4ece1] text-[#8a4f27] text-[9px] font-mono uppercase rounded font-semibold">
                {b.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Team & Access ──────────────────────────────────── */
function TeamSettings({ settings, update }: { settings: StoreSettings; update: (k: keyof StoreSettings, v: any) => void }) {
  const roles = settings.roles.split("\n").filter(Boolean);

  return (
    <div className="space-y-6">
      <Field label="Role Definitions" hint="Format: Role Name: Permission description (one per line)">
        <TextArea value={settings.roles} onChange={(v) => update("roles", v)} rows={5} />
      </Field>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#6d5c4c] uppercase tracking-wider">Permission Matrix Preview</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[9px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-left">Role</th>
                <th className="py-2.5 px-3 text-left">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241a12]/5">
              {roles.map((role, i) => {
                const [name, ...descParts] = role.split(":");
                const desc = descParts.join(":").trim();
                return (
                  <tr key={i} className="hover:bg-[#faf7f2]/50">
                    <td className="py-2.5 px-3 font-semibold text-[#241a12]">{name.trim()}</td>
                    <td className="py-2.5 px-3 text-[#6d5c4c]">{desc || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700">
        <p className="font-semibold">Note</p>
        <p className="mt-1">Role-based access control is currently configured as a reference matrix. Enforcement will be enabled in a future update with per-user role assignment in the Users management tab.</p>
      </div>
    </div>
  );
}
