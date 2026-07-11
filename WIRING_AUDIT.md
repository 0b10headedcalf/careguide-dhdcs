# CareGuide Frontend Wiring Audit

This audit records the visible product controls before the final wiring changes.
It intentionally excludes visual design changes.

| Component | Visible control | Expected action | Current behavior | Fixed behavior | API endpoint or state action |
| --- | --- | --- | --- | --- | --- |
| `Header` | English / Espanol | Change language without resetting the case | Updates the browser draft; does not persist the preference to an existing backend case | Persist locally and on the active case, with an honest retryable error if backend persistence fails | `CaseProvider.setLanguage`, `PATCH /api/cases/{case_id}` |
| `Header` | Voice | Enter voice-first intake | Routes to voice intake; intake creates or resumes a case | Preserve this behavior and fall back to focused text input when speech recognition is unavailable | `ensureCase`, `useSpeechRecognition` |
| `Header` | Sign in | Explain unavailable authentication | Opens a truthful browser-storage dialog | Preserve existing behavior | Dialog state |
| `HeroSection` | Start conversation | Create or resume a case, then open intake | Creates/resumes; continues locally when backend is unavailable | Preserve case and language; surface synchronization state in intake | `POST /api/cases`, `GET /api/cases/{case_id}` |
| `HeroSection` | Type instead | Enter text intake and focus input | Routes with `mode=text`; intake focuses the answer field | Preserve existing behavior | URL entry mode and input ref |
| `ActionCard` | Find Coverage | Continue intake or evaluate likely pathway | Opens intake; results page synchronizes answers and evaluates | Preserve existing behavior with abortable evaluation and retry | `POST /api/intake/confirm`, `POST /api/eligibility/evaluate` |
| `ActionCard` | Continue Application | Resume a real saved case or show empty state | Loads the stored case; shows an honest empty state | Preserve existing behavior | `GET /api/cases/{case_id}`, browser case storage |
| `ActionCard` | Find Local Help | Search real nearby resources | Uses real HRSA/DataSF results, but omits `case_id` from the resource request | Include case, location, and language; keep list usable if map fails | `GET /api/resources/nearby` |
| `IntakeFlowPage` | Answer / Continue | Save one answer at a time | Saves locally and confirms on the backend; retries by resyncing before evaluation | Preserve answers, advance case lifecycle, and never silently discard failures | `POST /api/intake/confirm` |
| `IntakeFlowPage` | Answer with voice | Transcribe into the same answer field as typing | Supported browsers transcribe; unsupported button is disabled with explanatory copy | Automatically focus typing when unsupported; retain the same answer payload | SpeechRecognition client hook |
| `ResultsPage` | See likely path | Evaluate a likely pathway | Calls the real rules engine and avoids eligibility claims | Preserve existing behavior and advance lifecycle | `POST /api/eligibility/evaluate` |
| `DocumentsPage` | Document statuses | Show routed checklist without fake uploads | Checklist derives from routed forms and user attestations | Preserve source-of-truth behavior and advance lifecycle | `POST /api/forms/route` |
| `ApplicationPage` | Review application fields | Route forms and show provenance metadata | Uses routed forms and mapped fields with source, confidence, review flag, and explanation | Preserve behavior and advance lifecycle | `POST /api/forms/route`, `POST /api/forms/map-fields` |
| `ReviewPage` | Verify packet | Identify missing or uncertain fields | Calls backend verification and gates handoff | Preserve behavior and advance lifecycle | `POST /api/forms/verify` |
| `ReviewPage` | Prepare printable packet | Create packet only after explicit review | Backend refuses `user_reviewed=false`; UI sends true only after review | Preserve gate, record `HANDOFF_CREATED`, and open printable HTML | `POST /api/handoff-passport`, `GET /api/handoff-passport/{packet_id}/html` |
| `HelpPage` | Search / filters / phone / script | Find and use verified local help | Uses real resources and browser-derived call script; no fabricated counselor data | Include active case and language, with loading/empty/error/retry states | `GET /api/resources/nearby` |
| Coverage journey | Action plan | Generate next actions from real case state | UI derives scattered next steps; required typed API method is absent | Return a backend-derived, validated action plan and use it for continuation | `GET /api/cases/{case_id}/action-plan` |
| `DashboardPage` | Continue plan | Route from persisted lifecycle | Frontend declares all states, but backend only persists early states | Persist every lifecycle transition through `HANDOFF_CREATED` | Case lifecycle state |
| `VoiceMissionControl` | Central voice orb | Record, transcribe, and review natural speech | Browser speech recognition only | MediaRecorder audio is sent to backend ElevenLabs STT; transcript must be reviewed before agent use | `POST /api/voice/transcribe` |
| `VoiceMissionControl` | Text input / ask form | Explain a form question or start guided help | No form-aware agent surface | Send read-only case context to the Gradient orchestrator with deterministic fallback | `POST /api/agent/message` |
| `VoiceMissionControl` | Explanation level | Request simple, standard, or detailed help | No explicit control | Include the selected level in every agent request | Agent request state |
| `DocumentUploadPanel` | Upload / confirm use | Persist a real document and confirm extracted text | No upload workflow | Validate, hash, store, extract TXT/PDF when possible, and never fake image OCR | `POST /api/documents/upload`, `POST /api/documents/{id}/confirm` |

## Cross-Cutting Audit

- Static layouts remain Server Components; interactive controls remain scoped Client Components.
- Browser APIs are guarded and invoked in effects or interaction handlers.
- API responses use runtime validators in `lib/coverage/schemas.ts`.
- No frontend console logging or hardcoded mock response path is present.
- The map uses one `APIProvider`; the verified resource list remains independent of map availability.
- The deployment currently requires the API service ingress fix and external secret rotation documented in `.do/app.yaml`.
