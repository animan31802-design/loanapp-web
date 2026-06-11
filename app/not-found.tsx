import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-20 h-20 bg-[#4B4BF7] rounded-3xl flex items-center justify-center mx-auto mb-6">
        <span className="text-white text-4xl font-black">₹</span>
      </div>
      <h1 className="text-6xl font-black text-[#4B4BF7] mb-2">404</h1>
      <p className="text-xl font-bold text-gray-800 mb-2">Page Not Found</p>
      <p className="text-gray-500 mb-8 max-w-xs">
        This page doesn't exist or you don't have permission to view it.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
