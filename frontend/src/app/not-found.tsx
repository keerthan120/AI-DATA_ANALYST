import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center text-[#ececec] px-4">
      <h2 className="text-xl font-semibold mb-2">Analysis Page Not Found</h2>
      <p className="text-sm text-[#8e8e8e] mb-4">The requested resource could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] text-sm text-[#ececec] transition"
      >
        Return to Data Analyst
      </Link>
    </div>
  );
}

