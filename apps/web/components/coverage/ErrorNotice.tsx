"use client";

import { devApiDetail, friendlyApiMessage } from "@/lib/coverage/api";

/**
 * Honest error state for a failed API call: friendly message for users,
 * plus the underlying detail in non-production builds. Optional retry.
 */
export function ErrorNotice({
  error,
  onRetry,
  retryLabel = "Try again"
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const detail = devApiDetail(error);
  return (
    <div
      role="alert"
      className="rounded-[18px] border border-[rgba(16,32,79,0.14)] bg-white p-5 shadow-[0_10px_28px_rgba(16,32,79,0.06)]"
    >
      <p className="text-base font-extrabold text-navy">{friendlyApiMessage(error)}</p>
      {detail ? (
        <p className="mt-2 break-all rounded-xl bg-[#F4EEE5] p-3 font-mono text-xs leading-5 text-[#24182A]">
          dev only: {detail}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-4 text-sm font-extrabold text-navy transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
