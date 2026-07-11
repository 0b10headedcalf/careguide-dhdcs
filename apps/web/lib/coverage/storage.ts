"use client";

import { useEffect, useState } from "react";
import type { CaseDraft } from "./types";

const CASE_DRAFT_KEY = "careguide.caseDraft.v1";
let memoryDraft: CaseDraft | null = null;

export const emptyCaseDraft: CaseDraft = {
  language: "en",
  confirmedFields: []
};

export function readCaseDraft(): CaseDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  let rawDraft: string | null;
  try {
    rawDraft = window.localStorage.getItem(CASE_DRAFT_KEY);
  } catch {
    return memoryDraft;
  }
  if (!rawDraft) {
    return memoryDraft;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as CaseDraft;
    const parsed = {
      ...emptyCaseDraft,
      ...parsedDraft,
      confirmedFields: Array.isArray(parsedDraft.confirmedFields)
        ? parsedDraft.confirmedFields
        : []
    };
    memoryDraft = parsed;
    return parsed;
  } catch {
    return memoryDraft;
  }
}

export function writeCaseDraft(draft: CaseDraft) {
  memoryDraft = draft;
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CASE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The in-memory copy keeps the current session usable.
  }
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
