import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Toaster, toast } from "sonner";
import { adminLogin } from "../lib/api";
import logoEmblem from "@/assets/Visvam Logo.png";
import logoWordmark from "@/assets/Visvam Logo_Wordmark.png";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("admin@visvam.com");
  const [password, setPassword] = useState("admin123");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoggingIn(true);
    const res = await adminLogin(email, password);
    setLoggingIn(false);
    if (res.success && res.token) {
      toast.success("Login successful.");
      onLoginSuccess();
    } else {
      toast.error(res.message || "Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-screen bg-[#140e0a] flex items-center justify-center p-6 text-[#fdfaf5]">
      <Toaster position="top-right" theme="dark" />
      <div className="w-full max-w-sm p-8 bg-[#1e1610] border border-[#3b2a1e] rounded shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
            <img src={logoEmblem} alt="Viśvam" className="h-10 w-auto object-contain" />
            <img src={logoWordmark} alt="Viśvam" className="h-6 w-auto object-contain brightness-125" />
          </div>
          <p className="text-[11px] font-mono text-[#8a4f27] uppercase tracking-wider">
            Admin Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#a68c78] font-mono uppercase text-[10px] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@visvam.com"
              className="w-full px-3 py-2.5 bg-[#140e0a] border border-[#3b2a1e] rounded text-[#fdfaf5] outline-none focus:border-[#8a4f27] font-mono"
            />
          </div>

          <div>
            <label className="block text-[#a68c78] font-mono uppercase text-[10px] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-[#140e0a] border border-[#3b2a1e] rounded text-[#fdfaf5] outline-none focus:border-[#8a4f27] font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-2.5 bg-[#8a4f27] hover:bg-[#a66233] text-white rounded font-mono uppercase text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Lock size={13} />
            <span>{loggingIn ? "Logging in..." : "Log In"}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-[#3b2a1e] text-center">
          <button
            type="button"
            onClick={() => {
              setEmail("admin@visvam.com");
              setPassword("admin123");
              toast.info("Demo credentials set.");
            }}
            className="text-[10px] font-mono text-[#a68c78] hover:text-white underline cursor-pointer"
          >
            Fill Demo Credentials (admin@visvam.com)
          </button>
        </div>
      </div>
    </div>
  );
}
