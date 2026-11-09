import React from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Console</span>
        </Link>
        <span className="text-xs font-mono text-zinc-500">Document ID: TERMS-2026-V1</span>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="space-y-2 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
            <FileCheck className="w-4 h-4 text-zinc-300" />
            <span>Operational Agreement</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Terms of Service</h1>
          <p className="text-xs text-zinc-500 font-mono">Effective: November 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            By deploying, logging into, or running queries through this Data Analyst instance, you agree 
            to be bound by these Terms of Service. If you are operating on behalf of an enterprise or institution, 
            you represent that you hold the authority to bind that entity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            2. Permitted Use and Analytical Verification
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This software is provided as an engineering tool for exploratory data analysis, automated SQL synthesis, 
            and statistical anomaly detection. While the underlying execution graph utilizes deterministic DuckDB 
            queries and verification guardrails, all synthesized queries and output insights should be audited prior 
            to informing critical financial or compliance decisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            3. Account Responsibilities and Credentials
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You are responsible for maintaining the confidentiality of your database-authenticated credentials. 
            All API keys supplied to the backend environment variables must be obtained legally and in compliance 
            with OpenRouter terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            4. Limitation of Liability
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            In no event shall the authors or copyright holders be liable for any claim, damages, or other 
            liability arising from data loss, system interruptions, or query inaccuracies incurred during 
            runtime data processing.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-xs text-zinc-600 font-mono text-center">
        Data Analyst Engine | Operational Guidelines
      </footer>
    </div>
  );
}
