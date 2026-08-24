import React, { useEffect, useState } from "react";
import { Search, ArrowUp, ArrowDown, X, Save, Check, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Product, getMerchandising, updateMerchandisingSlot } from "../lib/api";

// One entry here = one curated spot on the storefront. To add a new one
// later (another dropdown, a homepage "New Arrivals" row, etc.), add an
// entry to this array — the picker UI, save flow, and API are all generic.
interface SlotConfig {
  key: string;
  label: string;
  description: string;
  max: number;
}

const SLOTS: SlotConfig[] = [
  {
    key: "nav-nuts",
    label: "Navbar Dropdown — Nuts & Dried Fruits",
    description: "Shown when a shopper hovers \"Nuts & Dried Fruits\" in the site header.",
    max: 2,
  },
  {
    key: "nav-gourmet",
    label: "Navbar Dropdown — Gourmet",
    description: "Shown when a shopper hovers \"Gourmet\" in the site header.",
    max: 2,
  },
  {
    key: "nav-gifting",
    label: "Navbar Dropdown — Gifting",
    description: "Shown when a shopper hovers \"Gifting\" in the site header.",
    max: 2,
  },
  {
    key: "homepage-bestsellers",
    label: "Homepage — Bestsellers Section",
    description: "The exact products and order shown in \"The Viśvam Bestsellers\" on the homepage, independent of each product's own Bestseller checkbox.",
    max: 3,
  },
];

interface MerchandisingPageProps {
  products: Product[];
}

export default function MerchandisingPage({ products }: MerchandisingPageProps) {
  const [saved, setSaved] = useState<Record<string, Product[]>>({});
  const [draft, setDraft] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    getMerchandising().then((data) => {
      const normalized: Record<string, Product[]> = {};
      for (const slot of SLOTS) {
        normalized[slot.key] = data[slot.key] || [];
      }
      setSaved(normalized);
      setDraft(normalized);
      setLoading(false);
    });
  }, []);

  const isDirty = (key: string) => {
    const a = (draft[key] || []).map((p) => p._id).join(",");
    const b = (saved[key] || []).map((p) => p._id).join(",");
    return a !== b;
  };

  const addToSlot = (key: string, product: Product) => {
    setDraft((prev) => {
      const current = prev[key] || [];
      if (current.some((p) => p._id === product._id)) return prev;
      const max = SLOTS.find((s) => s.key === key)?.max ?? current.length + 1;
      if (current.length >= max) return prev;
      return { ...prev, [key]: [...current, product] };
    });
  };

  const removeFromSlot = (key: string, productId: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((p) => p._id !== productId),
    }));
  };

  const moveInSlot = (key: string, index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const list = [...(prev[key] || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, [key]: list };
    });
  };

  const handleSave = async (key: string) => {
    const ids = (draft[key] || []).map((p) => p._id!).filter(Boolean);
    setSavingKey(key);
    const res = await updateMerchandisingSlot(key, ids);
    setSavingKey(null);
    if (res.success) {
      setSaved((prev) => ({ ...prev, [key]: draft[key] || [] }));
      toast.success("Saved — live on the site now.");
    } else {
      toast.error(res.message || "Failed to save");
    }
  };

  if (loading) {
    return <div className="text-xs text-[#6d5c4c] py-10 text-center">Loading merchandising slots…</div>;
  }

  return (
    <div className="space-y-6 text-[#241a12]">
      <div>
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <LayoutTemplate size={22} className="text-[#8a4f27]" />
          Merchandising
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Control exactly which products appear in the navbar dropdowns and the homepage bestsellers section.
          Changes here go live on the site as soon as you save each card.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SLOTS.map((slot) => (
          <SlotCard
            key={slot.key}
            slot={slot}
            picks={draft[slot.key] || []}
            allProducts={products}
            dirty={isDirty(slot.key)}
            saving={savingKey === slot.key}
            onAdd={(p) => addToSlot(slot.key, p)}
            onRemove={(id) => removeFromSlot(slot.key, id)}
            onMove={(i, dir) => moveInSlot(slot.key, i, dir)}
            onSave={() => handleSave(slot.key)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  picks,
  allProducts,
  dirty,
  saving,
  onAdd,
  onRemove,
  onMove,
  onSave,
}: {
  slot: SlotConfig;
  picks: Product[];
  allProducts: Product[];
  dirty: boolean;
  saving: boolean;
  onAdd: (p: Product) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  const pickedIds = new Set(picks.map((p) => p._id));
  const isFull = picks.length >= slot.max;

  const matches =
    query.trim().length === 0
      ? []
      : allProducts
          .filter((p) => !pickedIds.has(p._id))
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.slug.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{slot.label}</h3>
          <p className="text-[11px] text-[#6d5c4c] mt-0.5">{slot.description}</p>
        </div>
        <span className="shrink-0 text-[10px] font-mono px-2 py-1 bg-[#f4ece1] text-[#8a4f27] rounded font-semibold">
          {picks.length} / {slot.max}
        </span>
      </div>

      {/* Current picks — ordered */}
      <div className="space-y-2">
        {picks.length === 0 && (
          <p className="text-[11px] text-[#6d5c4c]/70 italic py-2">
            Nothing picked yet — the site is showing its default fallback for this spot.
          </p>
        )}
        {picks.map((p, i) => (
          <div
            key={p._id}
            className="flex items-center gap-2.5 p-2 bg-[#faf7f2] border border-[#241a12]/10 rounded-lg"
          >
            <img
              src={p.images?.[0]}
              alt={p.name}
              className="size-9 object-cover rounded bg-white shrink-0 border border-[#241a12]/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{p.name}</p>
              <p className="text-[10px] text-[#6d5c4c] font-mono">₹{p.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Move up"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => onMove(i, 1)}
                disabled={i === picks.length - 1}
                className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Move down"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(p._id!)}
                className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition"
                title="Remove"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add product */}
      <div className="relative">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6d5c4c]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isFull}
            placeholder={isFull ? `Slot full (max ${slot.max})` : "Search products to add…"}
            className="w-full pl-7 pr-3 py-2 text-xs bg-[#faf7f2] border border-[#241a12]/10 rounded-lg outline-none focus:border-[#8a4f27] focus:ring-1 focus:ring-[#8a4f27]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        {matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#241a12]/10 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => {
                  onAdd(p);
                  setQuery("");
                }}
                className="w-full flex items-center gap-2.5 p-2 hover:bg-[#faf7f2] transition text-left"
              >
                <img
                  src={p.images?.[0]}
                  alt={p.name}
                  className="size-8 object-cover rounded bg-[#faf7f2] shrink-0 border border-[#241a12]/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-[#6d5c4c] uppercase font-mono">{p.category}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
          !dirty
            ? "bg-[#f4ece1] text-[#6d5c4c]/50 cursor-not-allowed"
            : "bg-[#3a2012] hover:bg-[#8a4f27] text-white shadow-sm"
        }`}
      >
        {saving ? (
          "Saving…"
        ) : dirty ? (
          <>
            <Save size={14} /> Save
          </>
        ) : (
          <>
            <Check size={14} /> Up to date
          </>
        )}
      </button>
    </div>
  );
}
