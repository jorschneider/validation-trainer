import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Validation Practice Trainer",
  description: "Practice validation skills for better communication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <nav className="bg-white shadow-sm border-b" role="navigation" aria-label="Main navigation">
            <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
              <Link 
                href="/" 
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Validation Trainer home"
              >
                Validation Trainer
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/" 
                  className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Practice
                </Link>
                <Link 
                  href="/reference" 
                  className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Playbook
                </Link>
                <Link 
                  href="/progress" 
                  className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Progress
                </Link>
              </div>
            </div>
          </nav>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
