import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Trash2,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  X,
  Check,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { RegisteredUser, getUsers, updateUserRole, deleteUser } from "../lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<RegisteredUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to load registered users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (u: RegisteredUser) => {
    setEditingUser(u);
    setEditName(u.name || "");
    setEditRole(u.role || "user");
    setEditPhone(u.phone || "");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await updateUserRole(editingUser._id, editRole, editName, editPhone);
      if (res.success) {
        toast.success("User updated successfully!");
        setEditingUser(null);
        loadUsers();
      } else {
        toast.error(res.message || "Failed to update user");
      }
    } catch {
      toast.error("Error updating user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const res = await deleteUser(deletingUser._id);
      if (res.success) {
        toast.success("User account deleted successfully");
        setDeletingUser(null);
        loadUsers();
      } else {
        toast.error(res.message || "Failed to delete user");
      }
    } catch {
      toast.error("Error deleting user");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickRoleToggle = async (u: RegisteredUser) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      const res = await updateUserRole(u._id, newRole);
      if (res.success) {
        toast.success(`Role updated to ${newRole.toUpperCase()} for ${u.name}`);
        loadUsers();
      } else {
        toast.error(res.message || "Failed to update role");
      }
    } catch {
      toast.error("Error updating user role");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalCustomers = users.filter((u) => u.role === "user").length;

  return (
    <div className="space-y-6 text-[#241a12]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241a12]/10 pb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#241a12]">
            Registered Users
          </h1>
          <p className="text-xs text-[#6d5c4c] mt-0.5">
            Manage user accounts, admin permissions, and profile details stored in MongoDB.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="px-3.5 py-1.5 bg-white border border-[#241a12]/15 text-[#241a12] hover:bg-[#f4ece1] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#8a4f27]" : "text-[#8a4f27]"} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-1">
          <span className="text-xs text-[#6d5c4c] font-medium block">Total Users</span>
          <p className="font-display font-bold text-2xl text-[#241a12]">{users.length}</p>
          <p className="text-[11px] text-[#6d5c4c]">Registered in system</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-1">
          <span className="text-xs text-[#6d5c4c] font-medium block">Admins</span>
          <p className="font-display font-bold text-2xl text-amber-800">{totalAdmins}</p>
          <p className="text-[11px] text-[#6d5c4c]">Full control privileges</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#241a12]/10 shadow-2xs space-y-1">
          <span className="text-xs text-[#6d5c4c] font-medium block">Customers</span>
          <p className="font-display font-bold text-2xl text-emerald-800">{totalCustomers}</p>
          <p className="text-[11px] text-[#6d5c4c]">Standard store accounts</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#241a12]/10 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#faf7f2] border border-[#241a12]/15 rounded-lg text-xs focus:outline-none focus:border-[#8a4f27]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          {(["all", "admin", "user"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition ${
                roleFilter === r
                  ? "bg-[#3a2012] text-white shadow-2xs"
                  : "bg-[#f4ece1]/60 text-[#6d5c4c] hover:bg-[#eadecc]"
              }`}
            >
              {r === "all" ? "All Users" : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#241a12]/10 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf7f2] text-[#6d5c4c] font-mono text-[10px] uppercase tracking-wider border-b border-[#241a12]/10">
              <tr>
                <th className="py-3.5 px-4">USER</th>
                <th className="py-3.5 px-4">ROLE</th>
                <th className="py-3.5 px-4">PHONE & LOCATION</th>
                <th className="py-3.5 px-4">JOINED DATE</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241a12]/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6d5c4c]">
                    Loading registered users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6d5c4c]">
                    No users found matching filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-[#faf7f2]/70 transition">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f8f1e7] text-[#8a4f27] font-semibold text-xs grid place-items-center uppercase border border-[#241a12]/10">
                          {u.name ? u.name.charAt(0) : "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-[#241a12] text-xs">{u.name || "User"}</p>
                          <p className="text-[11px] text-[#6d5c4c] flex items-center gap-1">
                            <Mail size={11} className="text-gray-400" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleQuickRoleToggle(u)}
                        title="Click to toggle role"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-semibold uppercase border transition cursor-pointer ${
                          u.role === "admin"
                            ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {u.role === "admin" ? <Shield size={11} /> : <UserCheck size={11} />}
                        <span>{u.role}</span>
                      </button>
                    </td>

                    {/* Phone & Address */}
                    <td className="py-3.5 px-4 text-[#6d5c4c]">
                      <p className="flex items-center gap-1 text-xs text-[#241a12]">
                        <Phone size={11} className="text-gray-400" />
                        {u.phone || "N/A"}
                      </p>
                      {u.address?.city && (
                        <p className="flex items-center gap-1 text-[10px] text-[#6d5c4c] mt-0.5">
                          <MapPin size={10} className="text-gray-400" />
                          {u.address.city}, {u.address.state || "India"}
                        </p>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6d5c4c]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-gray-600 hover:text-[#8a4f27] hover:bg-[#f4ece1] rounded transition"
                          title="Edit User Details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                          title="Delete User Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-[#241a12]/15 shadow-xl animate-fade-up">
            <div className="flex items-center justify-between border-b border-[#241a12]/10 pb-3">
              <h3 className="font-display font-bold text-lg text-[#241a12]">Edit User Controls</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-[#241a12] p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#6d5c4c] font-medium mb-1">Email (Read Only)</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email}
                  className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded text-gray-600"
                />
              </div>

              <div>
                <label className="block text-[#6d5c4c] font-medium mb-1">User Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#faf7f2] border border-[#241a12]/15 rounded text-[#241a12] focus:outline-none focus:border-[#8a4f27]"
                />
              </div>

              <div>
                <label className="block text-[#6d5c4c] font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#faf7f2] border border-[#241a12]/15 rounded text-[#241a12] focus:outline-none focus:border-[#8a4f27]"
                />
              </div>

              <div>
                <label className="block text-[#6d5c4c] font-medium mb-1">Access Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full p-2.5 bg-[#faf7f2] border border-[#241a12]/15 rounded text-[#241a12] focus:outline-none focus:border-[#8a4f27]"
                >
                  <option value="user">user (Standard Customer)</option>
                  <option value="admin">admin (Full Admin Control)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#241a12]/10 text-xs">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-[#241a12]/15 hover:bg-gray-100 rounded-lg text-[#241a12] font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-[#3a2012] hover:bg-[#8a4f27] text-white rounded-lg font-semibold transition"
              >
                {saving ? "Saving..." : "Save Controls"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 border border-[#241a12]/15 shadow-xl animate-fade-up text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 grid place-items-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#241a12]">Delete User Account?</h3>
              <p className="text-xs text-[#6d5c4c] mt-1 leading-relaxed">
                Are you sure you want to permanently delete user account <strong className="text-[#241a12]">{deletingUser.email}</strong> from MongoDB?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-[#241a12]/15 hover:bg-gray-100 rounded-lg text-[#241a12] font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
