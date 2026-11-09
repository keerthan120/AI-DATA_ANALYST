"use client";

import React, { useState } from "react";
import { loginUser, registerUser, forgotPassword, resetPassword } from "@/lib/api";
import { UserProfile } from "@/types";
import { X, Lock, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  
  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      if (res.user && res.token) {
        onSuccess(res.user, res.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await registerUser({ email, password, fullName });
      if (res.user && res.token) {
        onSuccess(res.user, res.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess("Reset token generated successfully.");
      if (res.reset_token) {
        setIssuedToken(res.reset_token);
        setResetToken(res.reset_token);
      }
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await resetPassword({ email, resetToken, newPassword });
      setSuccess(res.message);
      setIssuedToken(null);
      setTimeout(() => {
        setTab("login");
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab Headers */}
        <div className="flex border-b border-zinc-800 mb-6">
          <button
            onClick={() => { setTab("login"); setError(null); setSuccess(null); }}
            className={`pb-2.5 text-xs font-semibold mr-6 transition ${
              tab === "login"
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("register"); setError(null); setSuccess(null); }}
            className={`pb-2.5 text-xs font-semibold mr-6 transition ${
              tab === "register"
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setTab("forgot"); setError(null); setSuccess(null); }}
            className={`pb-2.5 text-xs font-semibold transition ${
              tab === "forgot"
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Reset Password
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-950/40 border border-red-900 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* 1. Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300">Password</label>
                <button
                  type="button"
                  onClick={() => setTab("forgot")}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-md transition disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        )}

        {/* 2. Register Form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-md transition disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* 3. Forgot / Reset Password Form */}
        {tab === "forgot" && (
          <div className="space-y-4">
            {!issuedToken ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter your registered account email to request a password reset code.
                </p>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@company.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-md transition disabled:opacity-50"
                >
                  {loading ? "Generating Code..." : "Generate Reset Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md">
                  <span className="text-[11px] text-zinc-400 block mb-1">Your Reset Token:</span>
                  <span className="font-mono text-sm font-bold text-zinc-100">{issuedToken}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Reset Code</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter 6-character code"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (minimum 6 characters)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-md transition disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

