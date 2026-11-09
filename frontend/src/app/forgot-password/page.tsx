"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPassword, resetPassword } from "@/lib/api";
import { Mail, Lock, Key, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess("Reset code has been generated.");
      if (res.reset_token) {
        setIssuedToken(res.reset_token);
        setResetToken(res.reset_token);
      }
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Failed to generate reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ email, resetToken, newPassword });
      setSuccess("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212121] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#2f2f2f] border border-[#383838] mb-4">
            <Key className="w-5 h-5 text-[#ececec]" />
          </div>
          <h1 className="text-xl font-semibold text-[#ececec]">Reset your password</h1>
          <p className="text-sm text-[#8e8e8e] mt-1">
            {step === "request"
              ? "Enter your email to receive a reset code"
              : "Enter the code and your new password"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#ececec] hover:bg-white text-[#212121] text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Generating code..." : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {issuedToken && (
              <div className="p-3 bg-[#2f2f2f] border border-[#383838] rounded-lg">
                <span className="text-xs text-[#8e8e8e] block mb-1">Your reset code:</span>
                <span className="font-mono text-sm font-semibold text-[#ececec]">{issuedToken}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#b4b4b4] mb-1.5">Reset code</label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Enter code from above"
                className="w-full bg-[#2f2f2f] border border-[#383838] rounded-lg px-4 py-2.5 text-sm text-[#ececec] placeholder-[#6b6b6b] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b4b4b4] mb-1.5">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8e8e8e] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#2f2f2f] border border-[#383838] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#ececec] placeholder-[#6b6b6b] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#ececec] hover:bg-white text-[#212121] text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Reset password"}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-[#8e8e8e] hover:text-[#ececec] transition inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

