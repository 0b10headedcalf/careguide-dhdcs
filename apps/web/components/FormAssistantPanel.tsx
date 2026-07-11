export function FormAssistantPanel({
  question,
  answerSource,
  status,
  candidate
}: {
  question: string;
  answerSource: string;
  status: string;
  candidate: { label: string; value: string; confidence?: number; needsReview: boolean } | null;
}) {
  return (
    <section className="border border-white/10 bg-[#202827] p-5 text-white sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9FC8BC]">Current form</p>
          <h2 className="mt-1 text-lg font-bold">CCFRM604 coverage application</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75">{status}</span>
      </div>
      <div className="mt-5 border-l-2 border-[#67C7AD] pl-4">
        <p className="text-sm font-semibold text-white/60">Current question</p>
        <p className="mt-1 text-base leading-7">{question}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-white/55">Why this is needed</dt><dd className="mt-1 font-semibold">Routes only the forms relevant to this case.</dd></div>
        <div><dt className="text-white/55">Answer source</dt><dd className="mt-1 font-semibold">{answerSource}</dd></div>
      </dl>
      {candidate ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">Suggested field</p>
          <p className="mt-2 font-bold">{candidate.label}</p>
          <p className="mt-1 text-sm text-white/70">{candidate.value}</p>
          <p className="mt-2 text-xs text-white/50">
            Source: agent suggestion
            {candidate.confidence !== undefined ? ` · ${Math.round(candidate.confidence * 100)}% confidence` : ""}
            {candidate.needsReview ? " · Needs review" : " · Confirm before use"}
          </p>
        </div>
      ) : null}
      <p className="mt-5 text-xs leading-5 text-white/55">
        Agent suggestions always need confirmation. CareGuide prepares information for review and does not submit an application.
      </p>
    </section>
  );
}
