import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Analyst: Multi-Agent Analytics Engine",
  description: "Production-grade multi-agent data analysis engine powered by LangGraph, DuckDB, and OpenRouter.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
