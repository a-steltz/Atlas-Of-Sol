import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"]
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"]
});

export const metadata: Metadata = {
    title: "Atlas of Sol",
    description: "A wonder-first interactive solar system experience."
};

/**
 * Root layout for all app routes.
 * Applies global font variables and baseline document structure.
 *
 * @param {Readonly<{ children: React.ReactNode }>} props - Layout props
 * @param {React.ReactNode} props.children - Route content to render
 * @returns {JSX.Element} Root HTML document wrapper
 */
export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
