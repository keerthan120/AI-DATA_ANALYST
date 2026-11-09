import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
        <span className="text-xs font-mono text-zinc-500">Document ID: PRIVACY-2026-V1</span>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="space-y-2 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4 text-zinc-300" />
            <span>Security & Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Privacy Policy</h1>
          <p className="text-xs text-zinc-500 font-mono">Last revised: November 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            1. Scope and Architecture
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This platform operates on an ephemeral, in-memory analytical architecture powered by DuckDB. 
            Uploaded datasets are held only in local application execution memory for the duration of 
            the analytical session. Data rows are never sold, transferred to third-party ad networks, 
            or indexed into global training corpuses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            2. Authentication and Account Records
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Account records (email address, securely hashed passwords using salted bcrypt algorithms, 
            and session timestamps) are stored in your configured PostgreSQL database. Passwords are never 
            stored or logged in plaintext. Password reset tokens are generated cryptographically and expire 
            after 1 hour.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            3. Large Language Model (LLM) Queries
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            When you execute natural language prompts, only schema definitions, column summaries, and aggregate 
            analytical metrics necessary to synthesize SQL and business answers are sent to the upstream 
            OpenRouter API proxy as specified in your environment configuration. Raw dataset rows remain isolated 
            within the local DuckDB instance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            4. Data Retention and Erasure
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You maintain full sovereignty over uploaded files. Reloading the application or terminating 
            the backend session flushes all DuckDB in-memory tables. User accounts can be permanently purged 
            from the PostgreSQL instance upon administrative request.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide font-mono">
            5. Contact and Responsible Disclosure
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            For operational inquiries, data erasure, or vulnerability reporting, please contact the systems 
            administrator via your configured deployment domain.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-xs text-zinc-600 font-mono text-center">
        Data Analyst Engine | Confidential & Proprietary
      </footer>
    </div>
  );
}
