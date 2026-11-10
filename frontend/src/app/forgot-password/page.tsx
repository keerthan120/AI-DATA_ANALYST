"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPassword, resetPassword } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { Mail, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPassword);
  const isPasswordStrong = hasMinLength && hasUpperLower && hasNumber && hasSpecial;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess(res.message || "A 6-digit verification code has been dispatched to your email address.");
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Failed to generate verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isPasswordStrong) {
      setError("Please fulfill all strong password requirements.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, resetToken, newPassword });
      setSuccess("Password updated successfully with strong security verification! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
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
              Reset your password
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === "request"
                ? "Enter your email to receive a 6-digit verification code"
                : "Enter the verification code and set a new strong password"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2cb8b2] hover:bg-[#23a8a2] text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 group disabled:opacity-60"
              >
                <span>{loading ? "Sending code..." : "Send Verification Code"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-center font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Strong Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-2 focus:ring-[#2cb8b2]/20 transition"
                  />
                </div>

                {newPassword && (
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
                className="w-full bg-[#2cb8b2] hover:bg-[#23a8a2] text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 group disabled:opacity-60"
              >
                <span>{loading ? "Updating..." : "Update Password"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
