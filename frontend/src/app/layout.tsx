import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Analyst",
  description: "Multi-agent data analysis engine powered by LangGraph and DuckDB.",
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
      <body className="min-h-screen bg-[#212121] text-[#ececec] antialiased">
        {children}
      </body>
    </html>
  );
}
