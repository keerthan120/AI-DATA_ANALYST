import React from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec] flex flex-col">
      <header className="h-12 border-b border-[#2f2f2f] px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#8e8e8e] hover:text-[#ececec] transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="space-y-2 border-b border-[#383838] pb-6">
          <div className="flex items-center gap-2 text-[#8e8e8e] text-xs uppercase tracking-wider">
            <FileCheck className="w-4 h-4" />
            <span>Agreement</span>
          </div>
          <h1 className="text-2xl font-semibold">Terms of Service</h1>
          <p className="text-xs text-[#6b6b6b]">Effective: November 2026</p>
        </div>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">1. Acceptance</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">By using this Data Analyst instance, you agree to these Terms. If operating on behalf of an organization, you represent you hold the authority to bind that entity.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">2. Permitted Use</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">This software is provided for exploratory data analysis, SQL synthesis, and anomaly detection. All synthesized queries and insights should be audited prior to informing critical decisions.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">3. Credentials</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">You are responsible for maintaining the confidentiality of your credentials. API keys must be obtained legally and in compliance with OpenRouter terms.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">4. Liability</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">The authors shall not be liable for claims arising from data loss, interruptions, or query inaccuracies during runtime processing.</p>
        </section>
      </main>
    </div>
  );
}
