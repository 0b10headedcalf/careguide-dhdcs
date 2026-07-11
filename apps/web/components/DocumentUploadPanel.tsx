"use client";

import { useEffect, useRef, useState } from "react";
import { confirmDocument, friendlyApiMessage, getDocuments, uploadDocument } from "@/lib/coverage/api";
import type { UploadedDocument } from "@/lib/coverage/schemas";

export function DocumentUploadPanel({ caseId, ensureCase }: { caseId: string | null; ensureCase: () => Promise<string> }) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_DOC_UPLOAD !== "false";
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!caseId) return;
    const controller = new AbortController();
    getDocuments(caseId, controller.signal)
      .then(setDocuments)
      .catch((loadError) => {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(loadError);
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [caseId]);

  const handleFile = async (file: File) => {
    setStatus("uploading");
    setError(null);
    try {
      const id = caseId ?? (await ensureCase());
      const document = await uploadDocument(id, file, "supporting_document");
      setDocuments((current) => [document, ...current.filter((item) => item.document_id !== document.document_id)]);
      setStatus("idle");
    } catch (uploadError) {
      setError(uploadError);
      setStatus("error");
    }
  };

  const confirm = async (document: UploadedDocument) => {
    try {
      const updated = await confirmDocument(document.document_id, true);
      setDocuments((current) => current.map((item) => item.document_id === updated.document_id ? updated : item));
    } catch (confirmError) {
      setError(confirmError);
      setStatus("error");
    }
  };

  return (
    <section className="border border-white/10 bg-[#202827] p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#F1B89A]">Documents</p>
          <h2 className="mt-1 text-lg font-bold">Add supporting records</h2>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={!enabled || status === "uploading"} className="min-h-10 border border-white/20 px-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50">
          {status === "uploading" ? "Uploading..." : "Upload"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void handleFile(file);
        event.target.value = "";
      }} />
      <p className="mt-3 text-sm leading-6 text-white/60">{enabled ? "Pay stub, ID, proof of address, income statement, or employer coverage document." : "Document upload is unavailable for this deployment."}</p>
      {error ? <p className="mt-3 text-sm text-[#FFB4A2]">{friendlyApiMessage(error)}</p> : null}
      <div className="mt-4 space-y-3">
        {documents.length ? documents.map((document) => (
          <div key={document.document_id} className="border-t border-white/10 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{document.filename}</p>
                <p className="mt-1 text-xs text-white/55">Extraction: {document.extraction_status.replace("_", " ")}</p>
              </div>
              {document.needs_confirmation ? (
                <button type="button" onClick={() => void confirm(document)} className="shrink-0 text-xs font-bold text-[#BFE4D8] underline underline-offset-4">Confirm use</button>
              ) : <span className="text-xs font-bold text-[#BFE4D8]">Confirmed</span>}
            </div>
            {document.extracted_text_preview ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/60">{document.extracted_text_preview}</p> : null}
          </div>
        )) : <p className="border-t border-white/10 pt-4 text-sm text-white/45">No documents added. Images are never presented as extracted text without OCR.</p>}
      </div>
    </section>
  );
}
