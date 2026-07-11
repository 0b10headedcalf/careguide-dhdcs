import { CoverageShell } from "@/components/coverage/CoverageShell";

export default function CoverageLayout({ children }: { children: React.ReactNode }) {
  return <CoverageShell>{children}</CoverageShell>;
}

