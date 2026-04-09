import type { Metadata } from "next";

import { Header } from "@/components/header";

import "./globals.css";

export const metadata: Metadata = {
  title: "MediNest Care",
  description: "Book doctors online for video consultations and in-person clinic visits."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="split">
            <span>MediNest Care</span>
            <span>Remote-first appointment booking for modern clinics.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
