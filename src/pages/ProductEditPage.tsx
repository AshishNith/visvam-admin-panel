import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Tag,
  Save,
  Trash2,
  Check,
  Sparkles,
  Layers,
  Plus,
  Info,
} from "lucide-react";
import {
  Product,
  IVariantAttribute,
  IProductVariant,
  createProduct,
  updateProduct,
  uploadMultipleImagesToCloudinary,
} from "../lib/api";
import { toast } from "sonner";

interface ProductEditPageProps {
  products: Product[];
  onRefresh: () => void;
}

export default function ProductEditPage({ products, onRefresh }: ProductEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [benefitInput, setBenefitInput] = useState("");

  // Variant attribute builder temporary input state
  const [newAttrName, setNewAttrName] = useState("");
  const [attrValueInputs, setAttrValueInputs] = useState<{ [attrIndex: number]: string }>({});

  const [productForm, setProductForm] = useState<Partial<Product>>({
    slug: "",
    name: "",
    tagline: "",
    price: 15,
    category: "nuts",
    badge: "Bestseller",
    images: ["https://res.cloudinary.com/dvwpxb2oa/image/upload/f_auto,q_auto/visvam_harvest/01_Almonds_Badam/DSC00414.jpg"],
    description: "",
    serving: "500g Pouch",
    benefits: ["Rich in Vitamin E", "100% Organic"],
    bestseller: true,
    isNew: false,
    stock: 100,
    hasVariants: false,
    variantAttributes: [],
    variants: [],
  });

  useEffect(() => {
    if (!isNew && id) {
      const found = products.find((p) => p._id === id || p.slug === id);
      if (found) {
        setProductForm(found);
      }
    }
  }, [id, isNew, products]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    toast.info(`Uploading ${files.length} image(s) to Cloudinary CDN...`);
    const res = await uploadMultipleImagesToCloudinary(Array.from(files));
    setUploadingImage(false);

    if (res.success && res.urls.length > 0) {
      setProductForm((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...res.urls],
      }));
      toast.success(`${res.urls.length} image(s) uploaded to Cloudinary!`);
    }

    if (res.errors.length > 0) {
      toast.error(`Upload errors: ${res.errors.join(", ")}`);
    }
  };

  const addManualImage = () => {
    if (!manualImageUrl.trim()) return;
    setProductForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), manualImageUrl.trim()],
    }));
    setManualImageUrl("");
    toast.success("Image URL added to gallery!");
  };

  const removeProductImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const setCoverImage = (index: number) => {
    const images = productForm.images || [];
    if (index <= 0 || index >= images.length) return;
    const selected = images[index];
    const rest = images.filter((_, i) => i !== index);
    setProductForm((prev) => ({
      ...prev,
      images: [selected, ...rest],
    }));
    toast.success("Main cover image set!");
  };

  const addBenefitTag = () => {
    if (!benefitInput.trim()) return;
    const current = productForm.benefits || [];
    if (!current.includes(benefitInput.trim())) {
      setProductForm((prev) => ({ ...prev, benefits: [...current, benefitInput.trim()] }));
    }
    setBenefitInput("");
  };

  const removeBenefitTag = (tagToRemove: string) => {
    setProductForm((prev) => ({
      ...prev,
      benefits: (prev.benefits || []).filter((b) => b !== tagToRemove),
    }));
  };

  const addAttribute = () => {
    if (!newAttrName.trim()) return;
    const current = productForm.variantAttributes || [];
    if (current.some((a) => a.name.toLowerCase() === newAttrName.trim().toLowerCase())) {
      toast.error(`Attribute "${newAttrName}" already exists.`);
      return;
    }
    setProductForm((prev) => ({
      ...prev,
      variantAttributes: [...current, { name: newAttrName.trim(), values: [] }],
    }));
    setNewAttrName("");
  };

  const removeAttribute = (attrIndex: number) => {
    setProductForm((prev) => ({
      ...prev,
      variantAttributes: (prev.variantAttributes || []).filter((_, i) => i !== attrIndex),
    }));
  };

  const addAttributeValue = (attrIndex: number) => {
    const val = (attrValueInputs[attrIndex] || "").trim();
    if (!val) return;
    const attrs = [...(productForm.variantAttributes || [])];
    if (!attrs[attrIndex]) return;
    if (attrs[attrIndex].values.includes(val)) {
      toast.error(`Value "${val}" already added.`);
      return;
    }
    attrs[attrIndex] = {
      ...attrs[attrIndex],
      values: [...attrs[attrIndex].values, val],
    };
    setProductForm((prev) => ({ ...prev, variantAttributes: attrs }));
    setAttrValueInputs((prev) => ({ ...prev, [attrIndex]: "" }));
  };

  const removeAttributeValue = (attrIndex: number, valToRemove: string) => {
    const attrs = [...(productForm.variantAttributes || [])];
    if (!attrs[attrIndex]) return;
    attrs[attrIndex] = {
      ...attrs[attrIndex],
      values: attrs[attrIndex].values.filter((v) => v !== valToRemove),
    };
    setProductForm((prev) => ({ ...prev, variantAttributes: attrs }));
  };

  const generateVariantCombinations = () => {
    const activeAttrs = (productForm.variantAttributes || []).filter(
      (a) => a.values && a.values.length > 0
    );
    if (activeAttrs.length === 0) {
      toast.error("Please add at least one attribute with values first (e.g. Grade or Weight).");
      return;
    }

    // Detect if user created separate option types for each grade with identical weights
    // (e.g. BOLD: [250g, 500g] and EXTRA BOLD: [250g, 500g])
    let normalizedAttrs = [...activeAttrs];
    const isRedundantCategorySplit =
      activeAttrs.length > 1 &&
      activeAttrs.every(
        (a) =>
          a.values.length > 0 &&
          JSON.stringify([...a.values].sort()) === JSON.stringify([...activeAttrs[0].values].sort())
      );

    if (isRedundantCategorySplit) {
      // User entered Grade names as Option Types and weights as values
      const gradeValues = activeAttrs.map((a) => {
        const words = a.name.trim().split(/\s+/);
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      });
      const weightValues = activeAttrs[0].values;

      normalizedAttrs = [
        { name: "Grade", values: gradeValues },
        { name: "Weight", values: weightValues },
      ];
      toast.info("Auto-adjusted structure to 'Grade' and 'Weight' options!");
    }

    // Cartesian product helper
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce(
        (acc, curr) => {
          return acc.flatMap((a) => curr.map((c) => [...a, c]));
        },
        [[]] as string[][]
      );
    };

    const valueArrays = normalizedAttrs.map((a) => a.values);
    const combinations = cartesian(valueArrays);

    const baseSlug = productForm.slug || generateSlug(productForm.name || "product");
    const existingVariants = productForm.variants || [];

    const newVariants: IProductVariant[] = combinations.map((combo, idx) => {
      const options: Record<string, string> = {};
      normalizedAttrs.forEach((attr, aIdx) => {
        options[attr.name] = combo[aIdx];
      });

      const title = combo.join(" · ");
      // Check if we already have a matching variant
      const matched = existingVariants.find((v) => {
        return normalizedAttrs.every(
          (attr) => v.options && v.options[attr.name] === options[attr.name]
        );
      });

      const skuCode = combo
        .map((c) => c.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4))
        .join("-");

      if (matched) {
        return {
          ...matched,
          title,
          options,
        };
      }

      return {
        sku: `${baseSlug.toUpperCase().slice(0, 4)}-${skuCode}`,
        title,
        options,
        price: productForm.price || 0,
        mrp: productForm.price ? Math.round(productForm.price * 1.15) : undefined,
        stock: productForm.stock ?? 50,
        isDefault: idx === 0,
      };
    });

    if (!newVariants.some((v) => v.isDefault) && newVariants.length > 0) {
      newVariants[0].isDefault = true;
    }

    setProductForm((prev) => ({
      ...prev,
      hasVariants: true,
      variantAttributes: normalizedAttrs,
      variants: newVariants,
    }));

    toast.success(`Generated ${newVariants.length} variant combination(s)!`);
  };

  const applyPreset = (presetType: "cashew_grade_weight" | "weight_only") => {
    const baseSlug = productForm.slug || "CSH";
    const basePrice = productForm.price || 749;

    if (presetType === "cashew_grade_weight") {
      const attrs: IVariantAttribute[] = [
        { name: "Grade", values: ["Bold", "Extra Bold"] },
        { name: "Weight", values: ["250g", "500g"] },
      ];
      const variants: IProductVariant[] = [
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-BLD-250`,
          title: "Bold · 250g",
          options: { Grade: "Bold", Weight: "250g" },
          price: 749,
          mrp: 799,
          stock: 50,
          isDefault: true,
        },
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-BLD-500`,
          title: "Bold · 500g",
          options: { Grade: "Bold", Weight: "500g" },
          price: 1399,
          mrp: 1499,
          stock: 45,
        },
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-XBLD-250`,
          title: "Extra Bold · 250g",
          options: { Grade: "Extra Bold", Weight: "250g" },
          price: 849,
          mrp: 899,
          stock: 35,
        },
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-XBLD-500`,
          title: "Extra Bold · 500g",
          options: { Grade: "Extra Bold", Weight: "500g" },
          price: 1599,
          mrp: 1699,
          stock: 25,
        },
      ];

      setProductForm((prev) => ({
        ...prev,
        hasVariants: true,
        variantAttributes: attrs,
        variants: variants,
      }));
      toast.success("Applied Grade & Weight matrix: Bold/Extra Bold × 250g/500g!");
    } else if (presetType === "weight_only") {
      const attrs: IVariantAttribute[] = [
        { name: "Weight", values: ["250g", "500g", "1kg"] },
      ];
      const variants: IProductVariant[] = [
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-250G`,
          title: "250g",
          options: { Weight: "250g" },
          price: Math.round(basePrice * 0.55),
          mrp: Math.round(basePrice * 0.62),
          stock: 50,
          isDefault: true,
        },
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-500G`,
          title: "500g",
          options: { Weight: "500g" },
          price: basePrice,
          mrp: Math.round(basePrice * 1.15),
          stock: 40,
        },
        {
          sku: `${baseSlug.toUpperCase().slice(0, 4)}-1KG`,
          title: "1kg",
          options: { Weight: "1kg" },
          price: Math.round(basePrice * 1.9),
          mrp: Math.round(basePrice * 2.1),
          stock: 25,
        },
      ];

      setProductForm((prev) => ({
        ...prev,
        hasVariants: true,
        variantAttributes: attrs,
        variants: variants,
      }));
      toast.success("Applied Weight matrix: 250g, 500g, 1kg!");
    }
  };

  const updateVariantRow = (index: number, field: keyof IProductVariant, value: any) => {
    const updated = [...(productForm.variants || [])];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], [field]: value };
    setProductForm((prev) => ({ ...prev, variants: updated }));
  };

  const setDefaultVariant = (index: number) => {
    const updated = (productForm.variants || []).map((v, i) => ({
      ...v,
      isDefault: i === index,
    }));
    const chosen = updated[index];
    setProductForm((prev) => ({
      ...prev,
      variants: updated,
      price: chosen?.price || prev.price,
    }));
    toast.success(`Default variant set to: ${chosen.title}`);
  };

  const removeVariantRow = (index: number) => {
    const updated = (productForm.variants || []).filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((v) => v.isDefault)) {
      updated[0].isDefault = true;
    }
    setProductForm((prev) => ({ ...prev, variants: updated }));
  };

  const addManualVariantRow = () => {
    const baseSlug = productForm.slug || generateSlug(productForm.name || "product");
    const newRow: IProductVariant = {
      sku: `${baseSlug.toUpperCase().slice(0, 4)}-CUSTOM`,
      title: "Custom Option",
      options: {},
      price: productForm.price || 0,
      stock: 50,
      isDefault: (productForm.variants || []).length === 0,
    };
    setProductForm((prev) => ({
      ...prev,
      hasVariants: true,
      variants: [...(prev.variants || []), newRow],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.slug || (!productForm.price && !productForm.hasVariants)) {
      toast.error("Please provide Name, Slug, and Price.");
      return;
    }

    if (productForm.hasVariants && (!productForm.variants || productForm.variants.length === 0)) {
      toast.error("Variants are enabled. Please generate or add at least one variant.");
      return;
    }

    // Auto sync price with default variant
    let effectivePrice = productForm.price || 0;
    if (productForm.hasVariants && productForm.variants && productForm.variants.length > 0) {
      const defaultVar = productForm.variants.find((v) => v.isDefault) || productForm.variants[0];
      if (defaultVar && defaultVar.price > 0) {
        effectivePrice = defaultVar.price;
      }
    }

    setSaving(true);
    const payload = {
      ...productForm,
      price: effectivePrice,
      images:
        productForm.images && productForm.images.length > 0
          ? productForm.images
          : [
              "https://res.cloudinary.com/dvwpxb2oa/image/upload/f_auto,q_auto/visvam_harvest/01_Almonds_Badam/DSC00414.jpg",
            ],
    };

    if (!isNew && productForm._id) {
      const res = await updateProduct(productForm._id, payload);
      setSaving(false);
      if (res.success) {
        toast.success("Product updated successfully!");
        onRefresh();
        navigate("/products");
      } else {
        toast.error(res.message || "Failed to update product.");
      }
    } else {
      const res = await createProduct(payload);
      setSaving(false);
      if (res.success) {
        toast.success("New product published!");
        onRefresh();
        navigate("/products");
      } else {
        toast.error(res.message || "Failed to create product.");
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 bg-white border border-[#241a12]/15 hover:bg-[#eadecc] rounded transition text-[#241a12]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display italic text-2xl text-[#241a12]">
              {isNew ? "Create New Product" : `Edit: ${productForm.name || "Product"}`}
            </h1>
            <p className="text-xs text-[#6d5c4c] font-mono">
              Cloudinary CDN Upload & Product Details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/products"
            className="px-4 py-2 bg-white border border-[#241a12]/15 text-[#241a12] rounded text-xs font-mono uppercase"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#241a12] hover:bg-[#8a4f27] text-white rounded text-xs font-mono uppercase font-semibold flex items-center gap-1.5 transition"
          >
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Product"}</span>
          </button>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Product Information Card */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 space-y-4">
          <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">1. Basic Info</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={productForm.name || ""}
                onChange={(e) => {
                  const name = e.target.value;
                  setProductForm({
                    ...productForm,
                    name,
                    slug: productForm.slug ? productForm.slug : generateSlug(name),
                  });
                }}
                placeholder="California Jumbo Almonds"
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[#6d5c4c] text-xs font-mono uppercase">URL Slug *</label>
                <button
                  type="button"
                  onClick={() => setProductForm((prev) => ({ ...prev, slug: generateSlug(prev.name || "") }))}
                  className="text-[10px] font-mono text-[#8a4f27] hover:underline"
                >
                  Auto-Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={productForm.slug || ""}
                onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                placeholder="california-jumbo-almonds"
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] font-mono text-[#241a12]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={productForm.price || 0}
                onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>

            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Category *</label>
              <select
                value={productForm.category || "nuts"}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] font-mono text-[#241a12]"
              >
                <option value="nuts">Nuts & Dried Fruits</option>
                <option value="gourmet">Gourmet Selection</option>
                <option value="gifting">Gifting & Hampers</option>
              </select>
            </div>

            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={productForm.stock ?? 100}
                onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Badge Tag</label>
              <input
                type="text"
                value={productForm.badge || ""}
                onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                placeholder="Bestseller, Organic, New"
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>

            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Tagline</label>
              <input
                type="text"
                value={productForm.tagline || ""}
                onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
                placeholder="Grade A1 · Cold-Stored"
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Full Description</label>
            <textarea
              rows={4}
              value={productForm.description || ""}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              placeholder="Detailed information about harvest origin, oil content, flavor profile..."
              className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12] resize-y"
            />
          </div>
        </div>

        {/* Specifications & Tags Card */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 space-y-4">
          <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">2. Specifications & Health Tags</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Packaging / Serving</label>
              <input
                type="text"
                value={productForm.serving || "500g Pouch"}
                onChange={(e) => setProductForm({ ...productForm, serving: e.target.value })}
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Health Benefits Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBenefitTag())}
                placeholder="e.g. Rich in Vitamin E, Heart Healthy"
                className="flex-1 px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27]"
              />
              <button
                type="button"
                onClick={addBenefitTag}
                className="px-4 py-2 bg-[#8a4f27] text-white rounded text-xs font-mono uppercase"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(productForm.benefits || []).map((benefit, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-[#eadecc] text-[#241a12] text-xs rounded-full flex items-center gap-1.5 font-mono"
                >
                  <Tag size={11} className="text-[#8a4f27]" />
                  {benefit}
                  <button
                    type="button"
                    onClick={() => removeBenefitTag(benefit)}
                    className="hover:text-rose-700 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Product Customizations & Variants Matrix Card */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#241a12]/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#8a4f27]" />
                <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">
                  3. Product Customizations & Variants
                </h3>
              </div>
              <p className="text-[11px] text-[#6d5c4c] font-sans mt-0.5">
                Enable multi-tier options like Cashew Grades (Bold, Extra Bold) and Weights (250g, 500g) with individual prices & stock.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer bg-[#faf7f2] px-3 py-1.5 rounded border border-[#241a12]/15 text-xs font-mono select-none">
              <input
                type="checkbox"
                checked={productForm.hasVariants || false}
                onChange={(e) => setProductForm({ ...productForm, hasVariants: e.target.checked })}
                className="accent-[#8a4f27] w-4 h-4 rounded cursor-pointer"
              />
              <span className="font-semibold text-[#241a12]">
                {productForm.hasVariants ? "Variants Enabled" : "Enable Variants"}
              </span>
            </label>
          </div>

          {productForm.hasVariants ? (
            <div className="space-y-6 pt-1">
              {/* Step A: Define Attributes (e.g. Grade, Weight) */}
              <div className="bg-[#faf7f2] p-4 rounded border border-[#241a12]/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-mono uppercase font-semibold text-[#241a12] flex items-center gap-1.5">
                      <Tag size={13} className="text-[#8a4f27]" />
                      Step 1: Define Option Types & Values
                    </h4>
                    <p className="text-[11px] text-[#6d5c4c] mt-0.5">
                      Example: Option 1 = <strong>Grade</strong> (Values: <code>Bold</code>, <code>Extra Bold</code>) and Option 2 = <strong>Weight</strong> (Values: <code>250g</code>, <code>500g</code>).
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-[#6d5c4c] uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset("cashew_grade_weight")}
                      className="px-2.5 py-1 bg-white hover:bg-[#eadecc] border border-[#8a4f27]/30 text-[#8a4f27] rounded text-[10px] font-mono font-semibold transition"
                    >
                      + Grade & Weight (Cashew)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("weight_only")}
                      className="px-2.5 py-1 bg-white hover:bg-[#eadecc] border border-[#241a12]/20 text-[#241a12] rounded text-[10px] font-mono transition"
                    >
                      + Weight (250g, 500g, 1kg)
                    </button>
                  </div>
                </div>

                {/* Add New Attribute Type Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
                    placeholder="Option name (e.g. Grade, Weight, Roast, Packaging)..."
                    className="flex-1 px-3 py-2 bg-white border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
                  />
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="px-4 py-2 bg-[#241a12] text-white rounded text-xs font-mono uppercase font-semibold flex items-center gap-1 hover:bg-[#8a4f27] transition cursor-pointer"
                  >
                    <Plus size={13} />
                    Add Option
                  </button>
                </div>

                {/* Existing Attributes List */}
                <div className="space-y-3 pt-1">
                  {(productForm.variantAttributes || []).map((attr, aIdx) => (
                    <div
                      key={aIdx}
                      className="bg-white p-3 rounded border border-[#241a12]/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#8a4f27] uppercase">
                            {attr.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#6d5c4c] bg-[#eadecc] px-2 py-0.5 rounded">
                            {attr.values.length} value(s)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttribute(aIdx)}
                          className="text-xs font-mono text-rose-600 hover:text-rose-800 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>

                      {/* Add Value Tag Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={attrValueInputs[aIdx] || ""}
                          onChange={(e) =>
                            setAttrValueInputs((prev) => ({ ...prev, [aIdx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addAttributeValue(aIdx);
                            }
                          }}
                          placeholder={`Add ${attr.name} value (e.g. ${
                            attr.name.toLowerCase().includes("weight")
                              ? "250g, 500g, 1kg"
                              : attr.name.toLowerCase().includes("grade")
                              ? "Bold, Extra Bold, Regular"
                              : "Type value and press enter"
                          })...`}
                          className="flex-1 px-3 py-1.5 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27]"
                        />
                        <button
                          type="button"
                          onClick={() => addAttributeValue(aIdx)}
                          className="px-3 py-1.5 bg-[#8a4f27] text-white rounded text-xs font-mono uppercase"
                        >
                          Add
                        </button>
                      </div>

                      {/* Values Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {attr.values.length === 0 ? (
                          <span className="text-[11px] font-mono italic text-[#6d5c4c]/70">
                            No values added yet. Type a value above and click Add.
                          </span>
                        ) : (
                          attr.values.map((val, vIdx) => (
                            <span
                              key={vIdx}
                              className="px-2.5 py-1 bg-[#f4ece1] text-[#241a12] text-xs rounded border border-[#241a12]/10 flex items-center gap-1.5 font-medium"
                            >
                              {val}
                              <button
                                type="button"
                                onClick={() => removeAttributeValue(aIdx, val)}
                                className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Combinations Action Bar */}
                {(productForm.variantAttributes || []).length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#241a12]/10">
                    <div className="flex items-center gap-1.5 text-xs text-[#6d5c4c]">
                      <Info size={13} className="text-[#8a4f27]" />
                      <span>Ready to build combinations matrix.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateVariantCombinations}
                        className="px-4 py-2 bg-[#8a4f27] hover:bg-[#241a12] text-white rounded text-xs font-mono uppercase font-semibold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Sparkles size={13} />
                        Auto-Generate Combinations
                      </button>
                      <button
                        type="button"
                        onClick={addManualVariantRow}
                        className="px-3 py-2 bg-white border border-[#241a12]/20 hover:bg-[#eadecc] text-[#241a12] rounded text-xs font-mono uppercase transition"
                      >
                        + Add Custom Row
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step B: Variant Matrix Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase font-semibold text-[#241a12]">
                    Step 2: Variant Pricing, Stock & SKU Matrix
                  </h4>
                  <span className="text-[11px] font-mono text-[#6d5c4c]">
                    {(productForm.variants || []).length} active variant(s)
                  </span>
                </div>

                {(!productForm.variants || productForm.variants.length === 0) ? (
                  <div className="p-8 text-center bg-[#faf7f2] rounded border border-dashed border-[#241a12]/20 space-y-2">
                    <Layers className="mx-auto text-[#8a4f27]/50" size={32} />
                    <p className="text-xs text-[#241a12] font-medium">No variants generated yet.</p>
                    <p className="text-[11px] text-[#6d5c4c]">
                      Add attributes above (e.g. Grade: Bold, Extra Bold; Weight: 250g, 500g) and click <strong>Auto-Generate Combinations</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#241a12]/15 rounded bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#faf7f2] border-b border-[#241a12]/15 text-[#6d5c4c] font-mono uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Default</th>
                          <th className="py-2.5 px-3 min-w-[160px]">Variant Title / Option</th>
                          <th className="py-2.5 px-3 min-w-[120px]">SKU Code</th>
                          <th className="py-2.5 px-3 w-28">Price (₹) *</th>
                          <th className="py-2.5 px-3 w-28">MRP (₹)</th>
                          <th className="py-2.5 px-3 w-24">Stock Qty</th>
                          <th className="py-2.5 px-3 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#241a12]/10">
                        {productForm.variants.map((variant, vIdx) => (
                          <tr
                            key={vIdx}
                            className={`hover:bg-[#faf7f2]/60 transition ${
                              variant.isDefault ? "bg-[#eadecc]/30" : ""
                            }`}
                          >
                            {/* Default Radio */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="radio"
                                name="defaultVariantRadio"
                                checked={variant.isDefault || false}
                                onChange={() => setDefaultVariant(vIdx)}
                                className="accent-[#8a4f27] cursor-pointer"
                                title="Set as default displayed variant"
                              />
                            </td>

                            {/* Title */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={variant.title}
                                onChange={(e) => updateVariantRow(vIdx, "title", e.target.value)}
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#241a12]/20 focus:border-[#8a4f27] focus:bg-white rounded text-xs font-semibold text-[#241a12] outline-none"
                              />
                            </td>

                            {/* SKU */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={variant.sku || ""}
                                onChange={(e) => updateVariantRow(vIdx, "sku", e.target.value)}
                                placeholder="SKU-CODE"
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#241a12]/20 focus:border-[#8a4f27] focus:bg-white rounded text-xs font-mono text-[#6d5c4c] outline-none"
                              />
                            </td>

                            {/* Price */}
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-[#6d5c4c] text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  value={variant.price || 0}
                                  onChange={(e) =>
                                    updateVariantRow(vIdx, "price", parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full pl-5 pr-2 py-1 bg-[#faf7f2] border border-[#241a12]/15 focus:border-[#8a4f27] focus:bg-white rounded text-xs font-medium text-[#241a12] outline-none"
                                />
                              </div>
                            </td>

                            {/* MRP */}
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-[#6d5c4c] text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={variant.mrp || ""}
                                  onChange={(e) =>
                                    updateVariantRow(
                                      vIdx,
                                      "mrp",
                                      e.target.value ? parseFloat(e.target.value) : undefined
                                    )
                                  }
                                  placeholder="Strike MRP"
                                  className="w-full pl-5 pr-2 py-1 bg-[#faf7f2] border border-[#241a12]/15 focus:border-[#8a4f27] focus:bg-white rounded text-xs text-[#6d5c4c] outline-none"
                                />
                              </div>
                            </td>

                            {/* Stock */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock ?? 50}
                                onChange={(e) =>
                                  updateVariantRow(vIdx, "stock", parseInt(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 bg-[#faf7f2] border border-[#241a12]/15 focus:border-[#8a4f27] focus:bg-white rounded text-xs text-[#241a12] outline-none"
                              />
                            </td>

                            {/* Action */}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeVariantRow(vIdx)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                                title="Delete this variant"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#faf7f2] p-4 rounded border border-dashed border-[#241a12]/15 text-xs text-[#6d5c4c] flex items-center justify-between">
              <span>This product is currently configured as a single standard item with base price <strong>₹{productForm.price || 0}</strong>.</span>
              <button
                type="button"
                onClick={() => setProductForm({ ...productForm, hasVariants: true })}
                className="text-[#8a4f27] hover:underline font-mono text-xs font-semibold"
              >
                + Enable Customizations
              </button>
            </div>
          )}
        </div>

        {/* Cloudinary CDN Product Gallery Card */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 space-y-4">
          <div className="flex justify-between items-center border-b border-[#241a12]/10 pb-2">
            <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">
              4. Cloudinary CDN Product Gallery
            </h3>
            <span className="text-xs font-mono text-[#6d5c4c]">
              {productForm.images?.length || 0} image(s)
            </span>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-[#8a4f27]/40 bg-[#f4ece1]/80 rounded p-6 text-center space-y-2 relative hover:bg-[#eadecc] transition">
            <Upload className="mx-auto text-[#8a4f27]" size={28} />
            <p className="text-xs text-[#241a12] font-medium">
              Click or drag image files here to upload directly to Cloudinary CDN
            </p>
            <p className="text-[10px] font-mono text-[#6d5c4c]">
              Target CDN folder: <code className="text-[#8a4f27]">visvam_harvest_products</code>
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={uploadingImage}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {uploadingImage && (
              <p className="text-xs font-mono text-[#8a4f27] font-semibold animate-pulse">
                Uploading to Cloudinary CDN...
              </p>
            )}
          </div>

          {/* Manual URL Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualImageUrl}
              onChange={(e) => setManualImageUrl(e.target.value)}
              placeholder="Or paste direct Cloudinary / HTTPS image URL..."
              className="flex-1 px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27]"
            />
            <button
              type="button"
              onClick={addManualImage}
              className="px-4 py-2 bg-[#241a12] text-white rounded text-xs font-mono uppercase"
            >
              Add URL
            </button>
          </div>

          {/* Gallery Grid */}
          {productForm.images && productForm.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {productForm.images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative group rounded border border-[#241a12]/15 bg-white overflow-hidden p-1 shadow-2xs"
                >
                  <img src={imgUrl} alt={`Product ${idx}`} className="h-28 w-full object-cover rounded" />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 bg-[#8a4f27] text-white text-[9px] font-mono px-2 py-0.5 rounded font-semibold uppercase">
                      Main Cover
                    </span>
                  )}
                  <div className="absolute inset-0 bg-[#241a12]/75 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5 p-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => setCoverImage(idx)}
                        className="text-[10px] font-mono bg-white text-[#241a12] px-2 py-1 rounded hover:bg-[#eadecc]"
                      >
                        Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imgUrl);
                        toast.success("Image URL copied!");
                      }}
                      className="text-[10px] font-mono bg-white/20 text-white px-2 py-1 rounded hover:bg-white/40"
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProductImage(idx)}
                      className="text-[10px] font-mono bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Checkboxes */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 flex gap-6 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-[#241a12]">
            <input
              type="checkbox"
              checked={productForm.bestseller || false}
              onChange={(e) => setProductForm({ ...productForm, bestseller: e.target.checked })}
              className="accent-[#8a4f27]"
            />
            <span className="font-medium">Mark as Bestseller</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[#241a12]">
            <input
              type="checkbox"
              checked={productForm.isNew || false}
              onChange={(e) =>
                setProductForm({ ...productForm, isNew: e.target.checked, isNewProduct: e.target.checked })
              }
              className="accent-[#8a4f27]"
            />
            <span className="font-medium">Mark as New Product</span>
          </label>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/products"
            className="px-5 py-2.5 bg-white border border-[#241a12]/15 text-[#241a12] rounded text-xs font-mono uppercase"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#241a12] hover:bg-[#8a4f27] text-white rounded text-xs font-mono uppercase font-semibold tracking-wider transition"
          >
            {saving ? "Saving..." : "Save & Publish Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
