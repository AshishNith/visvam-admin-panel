import React, { useState } from "react";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";
import {
  Employee,
  getEmployees,
  saveEmployee,
  updateEmployee,
  deleteEmployee,
} from "../lib/api";
import { toast } from "sonner";

interface EmployeesPageProps {
  employees: Employee[];
  onRefresh: () => void;
}

export default function EmployeesPage({ employees, onRefresh }: EmployeesPageProps) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "Operations",
    status: "Active",
  });

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "all" || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) {
      toast.error("Please fill in Name, Email, and Role.");
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, form);
      toast.success("Employee details updated.");
    } else {
      saveEmployee({
        name: form.name || "",
        email: form.email || "",
        phone: form.phone || "",
        role: form.role || "",
        department: (form.department as any) || "Operations",
        status: (form.status as any) || "Active",
      });
      toast.success("New employee added.");
    }
    setIsModalOpen(false);
    setEditingEmployee(null);
    onRefresh();
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    deleteEmployee(id);
    toast.info("Employee removed.");
    onRefresh();
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
              placeholder="Search employees by name, email, or role..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="py-2 px-2.5 text-xs bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
          >
            <option value="all">All Depts</option>
            <option value="Management">Management</option>
            <option value="Operations">Operations</option>
            <option value="Logistics">Logistics</option>
            <option value="Support">Support</option>
            <option value="Sales">Sales</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingEmployee(null);
            setForm({
              name: "",
              email: "",
              phone: "",
              role: "",
              department: "Operations",
              status: "Active",
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-[#241a12] hover:bg-[#8a4f27] text-white rounded text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={13} /> Add Employee
        </button>
      </div>

      <div className="bg-white rounded border border-[#241a12]/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#241a12]/10 bg-[#faf7f2] font-mono uppercase text-[10px] text-[#6d5c4c]">
            <tr>
              <th className="py-3 px-3">Employee Name</th>
              <th className="py-3 px-3">Role & Department</th>
              <th className="py-3 px-3">Contact Info</th>
              <th className="py-3 px-3">Joined Date</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241a12]/5">
            {filteredEmployees.map((e) => (
              <tr key={e.id} className="hover:bg-[#faf7f2]/50 transition">
                <td className="py-3 px-3 font-medium text-[#241a12]">
                  <p>{e.name}</p>
                  <p className="text-[10px] text-[#8a4f27] font-mono">{e.email}</p>
                </td>
                <td className="py-3 px-3">
                  <p className="font-medium text-[#241a12]">{e.role}</p>
                  <span className="text-[9.5px] font-mono text-[#6d5c4c] uppercase">{e.department}</span>
                </td>
                <td className="py-3 px-3 font-mono text-[#6d5c4c]">{e.phone || "-"}</td>
                <td className="py-3 px-3 font-mono text-[#6d5c4c]">{e.joinedDate}</td>
                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded font-semibold ${
                      e.status === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : e.status === "On Leave"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right space-x-1">
                  <button
                    onClick={() => {
                      setEditingEmployee(e);
                      setForm(e);
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-[#241a12] hover:text-[#8a4f27] hover:bg-[#eadecc] rounded transition"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(e.id, e.name)}
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

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#241a12]/50 backdrop-blur-xs">
          <div className="bg-[#faf7f2] border border-[#241a12]/20 rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#241a12]/10 pb-3">
              <h3 className="font-display italic text-2xl text-[#241a12]">
                {editingEmployee ? "Edit Employee Details" : "Add New Employee"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6d5c4c]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Madhavendra Mishra"
                  className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
                />
              </div>

              <div>
                <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. madhav@visvam.in"
                  className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
                  />
                </div>
                <div>
                  <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Department</label>
                  <select
                    value={form.department || "Operations"}
                    onChange={(e) => setForm({ ...form, department: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
                  >
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Support">Support</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Job Role *</label>
                  <input
                    type="text"
                    required
                    value={form.role || ""}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Sourcing Manager"
                    className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27]"
                  />
                </div>
                <div>
                  <label className="block text-[#6d5c4c] mb-1 font-mono uppercase text-[10px]">Status</label>
                  <select
                    value={form.status || "Active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-[#241a12]/15 rounded outline-none focus:border-[#8a4f27] font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#241a12]/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#eadecc] text-[#241a12] rounded font-mono uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#241a12] text-white rounded font-mono uppercase text-xs font-semibold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
