import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { Product, updateProduct, deleteProduct } from "../lib/api";
import { toast } from "sonner";

interface ProductsPageProps {
  products: Product[];
  onRefresh: () => void;
}

export default function ProductsPage({ products, onRefresh }: ProductsPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleUpdateStockInline = async (product: Product, newStock: number) => {
    if (!product._id) return;
    const res = await updateProduct(product._id, { stock: Math.max(0, newStock) });
    if (res.success) {
      toast.success(`Stock updated to ${newStock}`);
      onRefresh();
    } else {
      toast.error("Failed to update stock");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const res = await deleteProduct(id);
    setDeletingProductId(null);
    if (res.success) {
      toast.success(`${name} deleted.`);
      onRefresh();
    } else {
      toast.error(res.message || "Delete failed.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-md w-full">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d5c4c]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or slug..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] text-[#241a12]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-2.5 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
          >
            <option value="all">All Categories</option>
            <option value="nuts">Nuts</option>
            <option value="gourmet">Gourmet</option>
            <option value="gifting">Gifting</option>
          </select>
        </div>

        <Link
          to="/products/new"
          className="px-4 py-2 bg-[#241a12] hover:bg-[#8a4f27] text-white rounded text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={13} /> Add Product
        </Link>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded border border-[#241a12]/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#241a12]/10 bg-[#faf7f2] font-mono uppercase text-[10px] text-[#6d5c4c]">
            <tr>
              <th className="py-3 px-3">Product Item</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Stock</th>
              <th className="py-3 px-3">Badge</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {filteredProducts.map((p) => {
              const productId = p._id || p.slug;
              return (
                <tr
                  key={productId}
                  className="hover:bg-[#faf7f2]/70 cursor-pointer transition"
                  onClick={() => navigate(`/products/${productId}`)}
                >
                  <td className="py-3 px-3 flex items-center gap-2.5">
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="size-10 object-cover rounded bg-[#faf7f2] shrink-0 border border-[#241a12]/10"
                    />
                    <div>
                      <p className="font-medium text-[#241a12] hover:text-[#8a4f27] transition">{p.name}</p>
                      <p className="text-[10px] text-[#6d5c4c] font-mono">{p.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 uppercase font-mono text-[#8a4f27]">{p.category}</td>
                  <td className="py-3 px-3 font-semibold text-[#241a12]">₹{p.price.toFixed(2)}</td>
                  <td className="py-3 px-3 font-mono" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      value={p.stock ?? 100}
                      onChange={(e) => handleUpdateStockInline(p, parseInt(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 border border-[#241a12]/20 rounded text-center text-xs outline-none focus:border-[#8a4f27]"
                    />
                  </td>
                  <td className="py-3 px-3">
                    {p.badge && (
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-[#eadecc] text-[#241a12] rounded">
                        {p.badge}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/products/${productId}`}
                      className="p-1.5 text-[#241a12] hover:text-[#8a4f27] hover:bg-[#eadecc] rounded transition inline-block"
                      title="Edit Product Page"
                    >
                      <Edit size={14} />
                    </Link>
                    <button
                      onClick={() => p._id && setDeletingProductId(p._id)}
                      title="Delete Product"
                      className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#241a12]/50 backdrop-blur-xs">
          <div className="bg-[#faf7f2] border border-[#241a12]/20 rounded max-w-xs w-full p-5 space-y-3 text-center shadow-xl">
            <AlertCircle className="mx-auto text-rose-700" size={28} />
            <h3 className="font-display italic text-xl text-[#241a12]">Delete Product?</h3>
            <p className="text-xs text-[#6d5c4c]">This item will be permanently removed.</p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-3 py-1.5 bg-[#eadecc] text-[#241a12] text-xs font-mono uppercase rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const prod = products.find((p) => p._id === deletingProductId);
                  if (prod && prod._id) handleDeleteProduct(prod._id, prod.name);
                }}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-mono uppercase rounded font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
