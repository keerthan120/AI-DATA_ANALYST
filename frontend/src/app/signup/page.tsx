"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import { Mail, Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({ email, password, fullName });
      if (res.user && res.token) {
        localStorage.setItem("auth_token", res.token);
        localStorage.setItem("auth_user", JSON.stringify(res.user));
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212121] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#2f2f2f] border border-[#383838] mb-4">
            <svg width="20" height="20" style={{ width: "20px", height: "20px", maxWidth: "20px", maxHeight: "20px" }} className="w-5 h-5 text-[#ececec]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="6" rx="8" ry="3" />
              <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
              <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#ececec]">Create your account</h1>
          <p className="text-sm text-[#8e8e8e] mt-1">Start analyzing data with natural language</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#b4b4b4] mb-1.5">Full name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8e8e8e] absolute left-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-[#2f2f2f] border border-[#383838] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#ececec] placeholder-[#6b6b6b] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#b4b4b4] mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8e8e8e] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[#2f2f2f] border border-[#383838] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#ececec] placeholder-[#6b6b6b] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#b4b4b4] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8e8e8e] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#2f2f2f] border border-[#383838] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#ececec] placeholder-[#6b6b6b] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#ececec] hover:bg-white text-[#212121] text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#212121] border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[#8e8e8e] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#ececec] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

