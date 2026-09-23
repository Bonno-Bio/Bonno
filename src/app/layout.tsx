import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KgweboOS — Run your whole business from one dashboard",
  description: "Invoicing, customers, expenses, inventory and reports for small businesses in Botswana. Free to start, Premium for P47/month.",
  manifest: "/manifest.webmanifest",
  applicationName: "KgweboOS",
  appleWebApp: { capable: true, title: "KgweboOS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
