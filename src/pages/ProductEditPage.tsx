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
} from "lucide-react";
import {
  Product,
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
    origin: "California, USA",
    grade: "Grade A1",
    benefits: ["Rich in Vitamin E", "100% Organic"],
    bestseller: true,
    isNew: false,
    stock: 100,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.slug || !productForm.price) {
      toast.error("Please provide Name, Slug, and Price.");
      return;
    }

    setSaving(true);
    const payload = {
      ...productForm,
      images: productForm.images && productForm.images.length > 0
        ? productForm.images
        : ["https://res.cloudinary.com/dvwpxb2oa/image/upload/f_auto,q_auto/visvam_harvest/01_Almonds_Badam/DSC00414.jpg"],
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
                <option value="nuts">Nuts & Kernels</option>
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

            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Origin Location</label>
              <input
                type="text"
                value={productForm.origin || "California, USA"}
                onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                className="w-full px-3 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded text-xs outline-none focus:border-[#8a4f27] text-[#241a12]"
              />
            </div>

            <div>
              <label className="block text-[#6d5c4c] text-xs font-mono uppercase mb-1">Quality Grade</label>
              <input
                type="text"
                value={productForm.grade || "Grade A1"}
                onChange={(e) => setProductForm({ ...productForm, grade: e.target.value })}
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

        {/* Cloudinary CDN Product Gallery Card */}
        <div className="bg-white p-6 rounded border border-[#241a12]/10 space-y-4">
          <div className="flex justify-between items-center border-b border-[#241a12]/10 pb-2">
            <h3 className="font-mono text-xs text-[#8a4f27] uppercase font-semibold">
              3. Cloudinary CDN Product Gallery
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
