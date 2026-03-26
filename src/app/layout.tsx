import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const ClientLayout = dynamic(
  () => import("@/components/ClientLayout").then((mod) => mod.ClientLayout),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "UTP — Universal Transaction Protocol",
  description: "Decentralized governance, event voting, BTC-backed stablecoin, world news, and global legislature tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
