"use client";

import { usePathname } from "next/navigation";
import { AppHeader, ProgressHeader } from "./FlowComponents";

export function CoverageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <ProgressHeader pathname={pathname} />
      <main>{children}</main>
    </div>
  );
}

