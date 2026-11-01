import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "SyncSpace",
  description: "Team chat for workspaces, teams and channels",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
