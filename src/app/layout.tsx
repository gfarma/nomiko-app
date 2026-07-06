import type { Metadata } from "next";
import { Literata, Commissioner } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["greek", "latin"],
  variable: "--font-literata",
  display: "swap",
});

const commissioner = Commissioner({
  subsets: ["greek", "latin"],
  variable: "--font-commissioner",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Nomiko — Διαχείριση Δικηγορικού Γραφείου", template: "%s · Nomiko" },
  description:
    "SaaS διαχείρισης δικηγορικού γραφείου: πελάτες, υποθέσεις, προθεσμίες, έγγραφα, χρόνος εργασίας και τιμολόγηση.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${literata.variable} ${commissioner.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
