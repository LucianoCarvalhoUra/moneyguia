import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <main className="container mx-auto px-4 py-6 lg:px-8">
        <div className="rounded-md border border-slate-300/70 bg-slate-100/70 p-4 shadow-sm backdrop-blur-sm lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
