export function VoiceTranscriptReview({
  transcript,
  onTranscriptChange,
  onUse,
  onRecordAgain,
  disabled
}: {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onUse: () => void;
  onRecordAgain: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#D9E3F8] bg-white p-4">
      <label htmlFor="voice-transcript-review" className="text-sm font-semibold text-navy">
        Review transcript
      </label>
      <textarea
        id="voice-transcript-review"
        value={transcript}
        onChange={(event) => onTranscriptChange(event.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-[#D9E3F8] bg-white px-3 py-2 text-base leading-6 text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onUse}
          disabled={!transcript.trim() || disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primaryFill px-4 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-55"
        >
          Use this answer
        </button>
        <button
          type="button"
          onClick={onRecordAgain}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-primaryDark underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-55"
        >
          Record again
        </button>
      </div>
    </section>
  );
}
