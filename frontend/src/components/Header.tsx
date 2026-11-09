"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types";
import { AuthModal } from "./AuthModal";
import { Database, User as UserIcon, LogOut } from "lucide-react";

interface HeaderProps {
  tableCount: number;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  tableCount,
  currentUser,
  onUserChange,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    onUserChange(null);
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Database className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Data Analyst</h1>
              <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.2 rounded">
                Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block font-mono">
              DuckDB Analytics & Anomaly Detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Tables Count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>{tableCount} {tableCount === 1 ? "Table" : "Tables"}</span>
          </div>

          {/* User Account / Auth Control */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate max-w-[150px]">{currentUser.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md border border-transparent hover:border-zinc-800 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-md transition"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user, token) => {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("auth_user", JSON.stringify(user));
          onUserChange(user);
        }}
      />
    </>
  );
};
