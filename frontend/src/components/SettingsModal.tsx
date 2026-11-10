"use client";

import React, { useState, useEffect } from "react";
import { X, User, Mail, Building2, Shield, Lock, Check, Phone, Smartphone, AlertCircle } from "lucide-react";
import { updateProfileApi } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("Digital Back Office");
  const [role, setRole] = useState("Lead Data Analyst");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setFullName(u.full_name || u.fullName || u.email?.split("@")[0] || "Keerthan");
        setEmail(u.email || "user@digitalbackoffice.co.uk");
        setPhoneNumber(u.phone_number || u.phoneNumber || "+44 7911 123456");
        setCompany(u.company || u.organization || "Digital Back Office");
        setRole(u.role || "Lead Data Analyst");
        setIs2FAEnabled(Boolean(u.is_2fa_enabled));
      } else {
        setFullName("Keerthan");
        setEmail("user@digitalbackoffice.co.uk");
        setPhoneNumber("+44 7911 123456");
      }
    } catch {
      setFullName("Keerthan");
      setEmail("user@digitalbackoffice.co.uk");
      setPhoneNumber("+44 7911 123456");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Live password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPassword);
  const isPasswordStrong = hasMinLength && hasUpperLower && hasNumber && hasSpecial;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword) {
      if (!currentPassword) {
        setPasswordError("Current password is required to set a new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }
      if (!isPasswordStrong) {
        setPasswordError("Password must be strong: 8+ chars, upper & lower case, number, and special character.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await updateProfileApi({
        email: email,
        full_name: fullName,
        phone_number: phoneNumber,
        company: company,
        role: role,
        is_2fa_enabled: is2FAEnabled,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      if (res.user) {
        localStorage.setItem("auth_user", JSON.stringify(res.user));
      } else {
        const stored = localStorage.getItem("auth_user");
        const current = stored ? JSON.parse(stored) : {};
        const updated = {
          ...current,
          full_name: fullName,
          email: email,
          phone_number: phoneNumber,
          company: company,
          role: role,
          is_2fa_enabled: is2FAEnabled,
        };
        localStorage.setItem("auth_user", JSON.stringify(updated));
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#e2e8f0] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2cb8b2]/10 border border-[#2cb8b2]/20 flex items-center justify-center text-[#2cb8b2]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Profile & User Settings</h3>
              <p className="text-xs text-[#64748b]">Manage your account details, phone, and 2-step verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Profile Details */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Personal Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#334155]">Email Address</label>
                  <span className="text-[10px] text-[#94a3b8] font-medium">Cannot be changed</span>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    title="Email address cannot be changed (primary account ID)"
                    className="w-full pl-9 pr-3 py-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl text-xs text-[#64748b] cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+44 7911 123456"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Company / Organization</label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#e2e8f0]" />

          {/* 2-Step Verification Section */}
          <div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#b2e8e5] bg-[#eefaf9]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2cb8b2] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0f766e]">2-Step Verification (2FA)</h4>
                  <p className="text-[11px] text-[#0d9488]">
                    Require a 6-digit verification code when signing in
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={is2FAEnabled}
                  onChange={(e) => setIs2FAEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2cb8b2]"></div>
              </label>
            </div>
          </div>

          <hr className="border-[#e2e8f0]" />

          {/* Change Password with Strong Password Requirement */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Change Password</span>
            </h4>
            <p className="text-[11px] text-[#94a3b8] mb-3">Leave blank if you do not wish to change your password.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1">New Strong Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>

              {/* Strong Password Live Badges */}
              {newPassword && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Strong Password Checklist:
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
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-medium text-[#475569] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#2cb8b2] hover:bg-[#23a8a2] text-white text-xs font-medium transition shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
