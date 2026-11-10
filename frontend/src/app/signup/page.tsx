"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { Mail, Lock, User, Phone, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live password validation
  const hasMinLength = password.length >= 8;
  const hasUpperLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpperLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordStrong) {
      setError("Please fulfill all strong password requirements before creating your account.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({ email, password, fullName, phoneNumber });
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4">
              <BrandLogo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create an account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Start analyzing data with Digital Back Office
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Keerthan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone number (for 2-Step Verification)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 7911 123456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                />
              </div>

              {/* Strong Password Live Badges */}
              {password && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2cb8b2]" />
                    <span>Strong Password Requirements:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                      {hasMinLength ? "✓" : "○"} 8+ characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasUpperLower ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                      {hasUpperLower ? "✓" : "○"} Upper & lowercase
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                      {hasNumber ? "✓" : "○"} At least 1 number
                    </span>
                    <span className={`flex items-center gap-1 ${hasSpecial ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                      {hasSpecial ? "✓" : "○"} Special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#2cb8b2] hover:bg-[#23a8a2] text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              <span>{loading ? "Creating account..." : "Create Account"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[#2cb8b2] hover:text-[#23a8a2] transition"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
