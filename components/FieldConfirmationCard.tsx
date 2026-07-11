import type { GuideFieldCandidate } from "@/lib/coverage/api";

export function FieldConfirmationCard({
  candidate,
  onConfirm,
  onEdit,
  disabled
}: {
  candidate: GuideFieldCandidate;
  onConfirm: () => void;
  onEdit: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#D9E3F8] bg-white p-4">
      <p className="text-sm font-semibold text-primaryDark">Proposed answer</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-navy">Official label</dt>
          <dd className="mt-1 text-slatecare">{candidate.official_label}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Answer</dt>
          <dd className="mt-1 text-slatecare">{String(candidate.value)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Source</dt>
          <dd className="mt-1 text-slatecare">{candidate.source_type.replace("_", " ")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Confidence</dt>
          <dd className="mt-1 text-slatecare">{Math.round(candidate.confidence * 100)}%</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-6 text-slatecare">{candidate.explanation}</p>
      {candidate.needs_review ? (
        <p className="mt-2 inline-flex rounded-md bg-bgsoft px-2 py-1 text-xs font-semibold text-navy">
          Needs review
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primaryFill px-4 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-55"
        >
          Confirm and save
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-primaryDark underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-55"
        >
          Edit answer
        </button>
      </div>
    </section>
  );
}
