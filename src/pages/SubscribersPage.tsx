import React, { useState } from "react";
import { Search, Download, Trash2 } from "lucide-react";
import { NewsletterSubscriber, deleteSubscriber } from "../lib/api";
import { toast } from "sonner";

interface SubscribersPageProps {
  subscribers: NewsletterSubscriber[];
  onRefresh: () => void;
}

export default function SubscribersPage({ subscribers, onRefresh }: SubscribersPageProps) {
  const [search, setSearch] = useState("");

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteSubscriber = async (id: string) => {
    const res = await deleteSubscriber(id);
    if (res.success) {
      toast.info("Subscriber removed.");
      onRefresh();
    } else {
      toast.error(res.message || "Failed to delete subscriber");
    }
  };

  const exportSubscribersCSV = () => {
    if (subscribers.length === 0) return;
    const headers = "Subscriber Email,Status,Joined Date\n";
    const rows = subscribers
      .map((s) => `"${s.email}","${s.status}","${new Date(s.subscribedAt).toLocaleDateString()}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visvam_subscribers_${Date.now()}.csv`;
    a.click();
    toast.success("CSV exported.");
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
            placeholder="Search subscribers by email..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
          />
        </div>

        <button
          onClick={exportSubscribersCSV}
          className="px-3.5 py-1.5 bg-[#241a12] hover:bg-[#8a4f27] text-white rounded text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded border border-[#241a12]/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#241a12]/10 bg-[#faf7f2] font-mono uppercase text-[10px] text-[#6d5c4c]">
            <tr>
              <th className="py-3 px-3">Subscriber Email</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Joined Date</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {filteredSubscribers.map((s) => (
              <tr key={s._id} className="hover:bg-[#faf7f2]/50 transition">
                <td className="py-3 px-3 font-mono text-[#241a12]">{s.email}</td>
                <td className="py-3 px-3 font-mono text-emerald-800 font-medium uppercase text-[9.5px]">
                  {s.status}
                </td>
                <td className="py-3 px-3 font-mono text-[#6d5c4c]">
                  {new Date(s.subscribedAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => handleDeleteSubscriber(s._id)}
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
