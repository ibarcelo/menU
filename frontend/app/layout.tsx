import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "menU – Scan & Share Your Order",
  description: "Scan a restaurant menu and organize your group order in seconds.",
  // Viewport handled via <head> tag below for Next.js 14 compatibility
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#FF6B35" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontSize: "14px", maxWidth: "340px" },
          }}
        />
      </body>
    </html>
  );
}
