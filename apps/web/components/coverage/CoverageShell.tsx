"use client";

import { usePathname } from "next/navigation";
import { MapsProvider } from "@/components/maps/MapsProvider";
import { AppHeader, ProgressHeader } from "./FlowComponents";

export function CoverageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <MapsProvider>
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <ProgressHeader pathname={pathname} />
        <main>{children}</main>
      </div>
    </MapsProvider>
  );
}

