"use client";

import { useEffect, useState } from "react";
import type { CaseDraft } from "./types";

const CASE_DRAFT_KEY = "careguide.caseDraft.v1";

export const emptyCaseDraft: CaseDraft = {
  language: "en",
  confirmedFields: []
};

export function readCaseDraft(): CaseDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.localStorage.getItem(CASE_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as CaseDraft;
    return {
      ...emptyCaseDraft,
      ...parsedDraft,
      confirmedFields: Array.isArray(parsedDraft.confirmedFields)
        ? parsedDraft.confirmedFields
        : []
    };
  } catch {
    return null;
  }
}

export function writeCaseDraft(draft: CaseDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CASE_DRAFT_KEY, JSON.stringify(draft));
}

export function mergeCaseDraft(partialDraft: Partial<CaseDraft>) {
  const currentDraft = readCaseDraft() ?? emptyCaseDraft;
  const nextDraft = {
    ...currentDraft,
    ...partialDraft,
    confirmedFields: partialDraft.confirmedFields ?? currentDraft.confirmedFields
  };

  writeCaseDraft(nextDraft);
  return nextDraft;
}

export function useCaseDraft() {
  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft(readCaseDraft());
    setLoaded(true);
  }, []);

  const saveDraft = (nextDraft: CaseDraft) => {
    writeCaseDraft(nextDraft);
    setDraft(nextDraft);
  };

  const updateDraft = (partialDraft: Partial<CaseDraft>) => {
    const nextDraft = mergeCaseDraft(partialDraft);
    setDraft(nextDraft);
    return nextDraft;
  };

  return { draft, loaded, saveDraft, updateDraft };
}

