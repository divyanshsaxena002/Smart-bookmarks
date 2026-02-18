import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "SmartMarks — Save & Sync Your Bookmarks",
    description: "A fast, secure bookmark manager with real-time sync across all your devices. Powered by Supabase.",
    keywords: ["bookmarks", "bookmark manager", "save links", "sync bookmarks"],
    authors: [{ name: "SmartMarks" }],
    openGraph: {
        title: "SmartMarks — Save & Sync Your Bookmarks",
        description: "A fast, secure bookmark manager with real-time sync across all your devices.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="antialiased">{children}</body>
        </html>
    );
}
