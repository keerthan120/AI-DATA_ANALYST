import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Analyst | Digital Back Office",
  description: "Enterprise AI Data Analyst powered by Digital Back Office.",
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
    <html lang="en" className="light">
      <body className="min-h-screen bg-[#fcfdfd] text-[#0f172a] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
