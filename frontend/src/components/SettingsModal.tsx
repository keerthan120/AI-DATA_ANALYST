"use client";

import React, { useState, useEffect } from "react";
import { X, User, Mail, Building2, Shield, Lock, Check } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("Digital Back Office");
  const [role, setRole] = useState("Lead Data Analyst");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setFullName(u.full_name || u.fullName || u.email?.split("@")[0] || "Keerthan");
        setEmail(u.email || "user@digitalbackoffice.co.uk");
      } else {
        setFullName("Keerthan");
        setEmail("user@digitalbackoffice.co.uk");
      }
    } catch {
      setFullName("Keerthan");
      setEmail("user@digitalbackoffice.co.uk");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      const stored = localStorage.getItem("auth_user");
      const current = stored ? JSON.parse(stored) : {};
      const updated = {
        ...current,
        full_name: fullName,
        email: email,
        organization: organization,
        role: role,
      };
      localStorage.setItem("auth_user", JSON.stringify(updated));

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (e) {
      console.error("Error saving profile settings:", e);
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
              <p className="text-xs text-[#64748b]">Manage your account details and login credentials</p>
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
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                <label className="block text-xs font-medium text-[#334155] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Role / Designation</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#e2e8f0]" />

          {/* Change Password */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Change Password</span>
            </h4>

            {passwordError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {passwordError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#e2e8f0] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2cb8b2] hover:bg-[#23a8a2] rounded-xl transition shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
