"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { ensureCase, readStoredCaseId } from "./api";
import { emptyCaseDraft, mergeCaseDraft, readCaseDraft } from "./storage";
import type { CaseDraft, Language } from "./types";

type CaseContextValue = {
  /** null until hydration completes — render deterministic defaults until then. */
  draft: CaseDraft | null;
  /** false during server render and first client render. */
  loaded: boolean;
  language: Language;
  caseId: string | null;
  setLanguage: (language: Language) => void;
  updateDraft: (partial: Partial<CaseDraft>) => CaseDraft;
  /** Create or resume the backend case. Rejects when the backend is unreachable. */
  startOrResumeCase: () => Promise<string>;
};

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft(readCaseDraft() ?? emptyCaseDraft);
    setCaseId(readStoredCaseId());
    setLoaded(true);
  }, []);

  const updateDraft = useCallback((partial: Partial<CaseDraft>) => {
    const next = mergeCaseDraft(partial);
    setDraft(next);
    return next;
  }, []);

  const setLanguage = useCallback(
    (language: Language) => {
      // Language changes never reset the case — only the preference changes.
      updateDraft({ language });
    },
    [updateDraft]
  );

  const startOrResumeCase = useCallback(async () => {
    const language = (readCaseDraft() ?? emptyCaseDraft).language;
    const id = await ensureCase(language);
    setCaseId(id);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      draft,
      loaded,
      language: draft?.language ?? "en",
      caseId,
      setLanguage,
      updateDraft,
      startOrResumeCase
    }),
    [draft, loaded, caseId, setLanguage, updateDraft, startOrResumeCase]
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCase(): CaseContextValue {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCase must be used inside CaseProvider");
  }
  return context;
}
