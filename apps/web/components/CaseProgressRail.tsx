import type { CaseState } from "@/lib/coverage/state-machine";

const STEPS: Array<{ state: CaseState; label: string }> = [
  { state: "INTAKE_IN_PROGRESS", label: "Intake" },
  { state: "PATHWAY_IDENTIFIED", label: "Pathway" },
  { state: "DOCUMENTS_PENDING", label: "Documents" },
  { state: "FORM_DRAFTED", label: "Forms" },
  { state: "READY_FOR_HUMAN_REVIEW", label: "Review" },
  { state: "HANDOFF_CREATED", label: "Handoff" }
];

export function CaseProgressRail({ current }: { current: CaseState }) {
  const currentIndex = current === "STARTED" ? -1 : Math.max(0, STEPS.findIndex((step) => step.state === current));
  return (
    <nav aria-label="Case progress" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {STEPS.map((step, index) => (
          <li key={step.state} className="flex items-center gap-2">
            <span className={index <= currentIndex ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#BFE4D8] text-xs font-bold text-[#102A2B]" : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60"}>
              {index + 1}
            </span>
            <span className={index <= currentIndex ? "text-white" : "text-white/55"}>{step.label}</span>
            {index < STEPS.length - 1 ? <span className="h-px w-5 bg-white/20" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
