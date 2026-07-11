"use client";

import { useRef, useState } from "react";
import { uploadGuideDocument, type UploadedDocument } from "@/lib/coverage/api";

export function DocumentUploadPanel({
  ensureCase,
  onUploaded
}: {
  ensureCase: () => Promise<string>;
  onUploaded?: (document: UploadedDocument) => void;
}) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_DOC_UPLOAD !== "false";
  const inputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setStatus("uploading");
    setError("");
    try {
      const caseId = await ensureCase();
      const uploaded = await uploadGuideDocument(caseId, file);
      setDocument(uploaded);
      onUploaded?.(uploaded);
      setStatus("idle");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setStatus("error");
    }
  };

  return (
    <section className="rounded-md border border-[#D9E3F8] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primaryDark">Documents</p>
          <p className="mt-1 text-sm leading-6 text-slatecare">
            Upload a PDF, image, or text file. CareGuide will ask before using document-derived data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!enabled || status === "uploading"}
          className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[#D9E3F8] bg-skysoft px-3 text-sm font-semibold text-primaryDark transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === "uploading" ? "Uploading" : "Upload"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
      {document ? (
        <div className="mt-3 rounded-md bg-bgsoft p-3">
          <p className="truncate text-sm font-semibold text-navy">{document.filename}</p>
          <p className="mt-1 text-xs font-semibold text-slatecare">
            Extraction: {document.extraction_status.replace("_", " ")}
          </p>
          {document.extracted_text_preview ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slatecare">
              {document.extracted_text_preview}
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#A84234]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
