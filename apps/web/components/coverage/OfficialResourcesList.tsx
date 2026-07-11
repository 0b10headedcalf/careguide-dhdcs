"use client";

import { ResourceCard } from "./FlowComponents";
import { ErrorNotice } from "./ErrorNotice";
import type { ResourceSearchResult } from "@/lib/coverage/types";

type LoadStatus = "idle" | "loading" | "empty" | "error" | "success";

/**
 * Presents verified backend resources. Fetching is owned by the parent so
 * other controls (phone list, counselor panel) can reuse the same real data.
 */
export function OfficialResourcesList({
  zip,
  status,
  resources,
  error,
  onRetry
}: {
  zip: string;
  status: LoadStatus;
  resources: ResourceSearchResult[];
  error: unknown;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <p className="rounded-xl border border-[rgba(16,32,79,0.10)] bg-white p-4 text-sm font-semibold text-navy">
        Looking up verified resources near {zip}…
      </p>
    );
  }

  if (status === "error") {
    return <ErrorNotice error={error} onRetry={onRetry} />;
  }

  if (status === "empty") {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-[rgba(16,32,79,0.10)] bg-white p-4 text-sm font-semibold text-navy">
          No verified HRSA or DataSF resources found within 5 miles of {zip}. Try a nearby ZIP,
          or search{" "}
          <a
            href="https://findahealthcenter.hrsa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            HRSA Find a Health Center
          </a>{" "}
          directly.
        </p>
      </div>
    );
  }

  if (!resources.length) return null;

  return (
    <div className="space-y-3">
      {resources.map((resource, index) => (
        <ResourceCard
          key={`${resource.sourceId ?? "src"}-${resource.name}-${index}`}
          resource={resource}
        />
      ))}
    </div>
  );
}
