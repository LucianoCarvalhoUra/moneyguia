import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
