import React, { useState } from "react";
import { Search, Mail, Trash2 } from "lucide-react";
import { ContactInquiry, updateInquiryStatus, deleteInquiry } from "../lib/api";
import { toast } from "sonner";

interface InquiriesPageProps {
  inquiries: ContactInquiry[];
  onRefresh: () => void;
}

export default function InquiriesPage({ inquiries, onRefresh }: InquiriesPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInquiries = inquiries.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.message.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateInquiryStatus = async (id: string, status: string) => {
    const res = await updateInquiryStatus(id, status);
    if (res.success) {
      toast.success(`Inquiry marked as ${status}`);
      onRefresh();
    } else {
      toast.error(res.message || "Failed to update inquiry");
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    const res = await deleteInquiry(id);
    if (res.success) {
      toast.info("Inquiry removed.");
      onRefresh();
    } else {
      toast.error(res.message || "Failed to delete inquiry");
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
            placeholder="Search inquiries by name, email, or message..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#6d5c4c]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded border border-[#241a12]/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#241a12]/10 bg-[#faf7f2] font-mono uppercase text-[10px] text-[#6d5c4c]">
            <tr>
              <th className="py-3 px-3">Customer Name</th>
              <th className="py-3 px-3">Email Address</th>
              <th className="py-3 px-3">Message Content</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {filteredInquiries.map((i) => (
              <tr key={i._id} className="hover:bg-[#faf7f2]/50 transition">
                <td className="py-3 px-3 font-medium text-[#241a12]">{i.name}</td>
                <td className="py-3 px-3 text-[#8a4f27] font-mono">
                  <a href={`mailto:${i.email}`} className="hover:underline flex items-center gap-1">
                    <Mail size={12} /> {i.email}
                  </a>
                </td>
                <td className="py-3 px-3 max-w-xs text-[#6d5c4c]">{i.message}</td>
                <td className="py-3 px-3">
                  <select
                    value={i.status}
                    onChange={(e) => handleUpdateInquiryStatus(i._id, e.target.value)}
                    className="bg-white border border-[#241a12]/20 text-xs px-2 py-0.5 rounded outline-none font-mono"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => handleDeleteInquiry(i._id)}
                    className="p-1 text-rose-700 hover:bg-rose-50 rounded transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
