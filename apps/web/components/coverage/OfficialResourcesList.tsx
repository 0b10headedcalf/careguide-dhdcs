"use client";

import { useEffect, useState } from "react";
import { ResourceCard } from "./FlowComponents";
import { fetchNearbyResources } from "@/lib/coverage/api";
import type { ResourceSearchResult } from "@/lib/coverage/types";

type LoadStatus = "idle" | "loading" | "empty" | "error";

export function OfficialResourcesList({ zip }: { zip: string }) {
  const [resources, setResources] = useState<ResourceSearchResult[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  useEffect(() => {
    const trimmed = zip.trim();
    if (!trimmed) {
      setResources([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setResources([]);

    fetchNearbyResources(trimmed).then((list) => {
      if (cancelled) return;
      setResources(list);
      setStatus(list.length === 0 ? "empty" : "idle");
    });

    return () => {
      cancelled = true;
    };
  }, [zip]);

  if (status === "loading") {
    return (
      <p className="rounded-xl border border-[rgba(16,32,79,0.10)] bg-white p-4 text-sm font-semibold text-navy">
        Looking up verified resources near {zip}…
      </p>
    );
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

  if (status === "error") {
    return (
      <p className="rounded-xl border border-[rgba(16,32,79,0.10)] bg-white p-4 text-sm font-semibold text-navy">
        Could not reach the verified-resources service. Try again in a moment.
      </p>
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
