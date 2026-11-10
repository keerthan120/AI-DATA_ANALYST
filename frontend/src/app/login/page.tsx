"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, verify2FA } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (is2FARequired) {
        // Step 2: Verify 6-digit 2FA code
        const res = await verify2FA({ email, code: twoFactorCode });
        if (res.user && res.token) {
          localStorage.setItem("auth_token", res.token);
          localStorage.setItem("auth_user", JSON.stringify(res.user));
          router.push("/");
        }
      } else {
        // Step 1: Login with Email & Password
        const res = await loginUser({ email, password });
        if (res.requires_2fa) {
          setIs2FARequired(true);
          setInfoMessage(res.message);
          return;
        }
        if (res.user && res.token) {
          localStorage.setItem("auth_token", res.token);
          localStorage.setItem("auth_user", JSON.stringify(res.user));
          router.push("/");
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials or verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-10">
          {/* Logo & Heading */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4">
              <BrandLogo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {is2FARequired ? "2-Step Verification" : "Welcome back"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {is2FARequired
                ? "Enter the 6-digit security code sent to your device"
                : "Sign in to Digital Back Office AI Data Analyst"}
            </p>
          </div>

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#2cb8b2]" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!is2FARequired ? (
              <>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-[#2cb8b2] hover:text-[#23a8a2] transition"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg tracking-widest font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#2cb8b2] hover:bg-[#23a8a2] text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              <span>{loading ? "Verifying..." : is2FARequired ? "Verify & Sign In" : "Continue"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </button>
          </form>

          {is2FARequired && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIs2FARequired(false);
                  setTwoFactorCode("");
                }}
                className="text-xs text-[#2cb8b2] hover:underline"
              >
                Back to email sign in
              </button>
            </div>
          )}

          {/* Bottom Switch */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#2cb8b2] hover:text-[#23a8a2] transition"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
