import type { GuideQuestion } from "@/lib/coverage/api";

export function FormQuestionPanel({
  question,
  section,
  explanationLevel
}: {
  question: GuideQuestion | null;
  section: string;
  explanationLevel: string;
}) {
  if (!question) {
    return (
      <section className="rounded-md border border-[#D9E3F8] bg-white p-4">
        <p className="text-sm font-semibold text-primaryDark">Next section</p>
        <p className="mt-2 text-base leading-6 text-navy">
          This section looks ready for review. You can continue or ask for an explanation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[#D9E3F8] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-primaryDark">{section}</p>
        <span className="rounded-md bg-bgsoft px-2 py-1 text-xs font-semibold text-slatecare">
          {explanationLevel}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-navy">
        {question.user_facing_question}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slatecare">{question.why_needed}</p>
      <details className="mt-3 rounded-md bg-bgsoft p-3 text-sm leading-6 text-slatecare">
        <summary className="cursor-pointer font-semibold text-navy">Official label</summary>
        <p className="mt-1">{question.official_label}</p>
      </details>
    </section>
  );
}
