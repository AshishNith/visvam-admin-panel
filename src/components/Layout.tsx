import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  Mail,
  Users,
  UserCheck,
  BarChart2,
  Settings,
  RotateCw,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Toaster } from "sonner";
import logoEmblem from "@/assets/Visvam Logo.png";
import logoWordmark from "@/assets/Visvam Logo_Wordmark.png";

interface LayoutProps {
  onLogout: () => void;
  onRefreshData?: () => void;
  loading?: boolean;
}

export default function Layout({ onLogout, onRefreshData, loading }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#faf7f2] text-[#241a12] font-sans">
      <Toaster position="top-right" theme="light" />

      {/* Modern Minimal Sidebar */}
      <aside className="w-60 bg-[#f4ece1]/80 border-r border-[#241a12]/10 flex flex-col justify-between p-6 shrink-0 select-none">
        <div className="space-y-8">
          {/* Logo Brand Header */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logoEmblem} alt="Viśvam" className="h-9 w-auto object-contain" />
            <div>
              <img src={logoWordmark} alt="Viśvam" className="h-5 w-auto object-contain" />
              <p className="text-[10px] font-mono text-[#8a4f27] font-medium tracking-wider mt-0.5">
                Admin Panel
              </p>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 text-xs">
            {[
              { to: "/", label: "Dashboard", icon: LayoutGrid },
              { to: "/products", label: "Products", icon: Package },
              { to: "/orders", label: "Orders", icon: ShoppingBag },
              { to: "/users", label: "Users", icon: Users },
              { to: "/inquiries", label: "Inquiries", icon: Mail },
              { to: "/subscribers", label: "Subscribers", icon: UserCheck },
              { to: "/employees", label: "Employees", icon: UserCheck },
              { to: "/reports", label: "Reports", icon: BarChart2 },
              { to: "/settings", label: "Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === "/"}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 font-medium ${
                      isActive
                        ? "bg-[#3a2012] text-white shadow-xs"
                        : "text-[#6d5c4c] hover:bg-[#eadecc]/70 hover:text-[#241a12]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className={isActive ? "text-white" : "text-[#6d5c4c]"} />
                      <span className="tracking-tight text-[13px]">{tab.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Action Buttons & Footer */}
        <div className="pt-5 border-t border-[#241a12]/10 space-y-2.5">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 bg-[#3a2012] hover:bg-[#8a4f27] text-white rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xs"
          >
            <span>STORE FRONT</span>
            <ExternalLink size={13} />
          </a>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="w-full py-2 bg-white hover:bg-[#f4ece1] border border-[#241a12]/15 text-[#241a12] rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 shadow-2xs"
            >
              <RotateCw size={13} className={loading ? "animate-spin text-[#8a4f27]" : "text-[#241a12]"} />
              <span>Refresh Data</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full py-2 bg-[#eadecc]/60 hover:bg-rose-100 hover:text-rose-900 text-[#241a12] rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Log Out
          </button>

          <p className="text-center text-[10px] text-[#6d5c4c]/80 font-sans pt-1">© 2026 Viśvam</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#faf7f2] p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
