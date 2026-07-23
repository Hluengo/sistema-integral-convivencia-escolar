# 11 — PDF Analysis Pipeline

> **Referencia detallada:** `docs/architecture/document-generation.md`

## Two-Step Workflow

### Step 1: Analysis (POST /api/process-disciplinary-pdf)

```
Client uploads PDF → Supabase Storage (disciplinary-processes bucket)
  → POST /api/process-disciplinary-pdf
  │
  ├── 1. requireAuth (JWT verification)
  ├── 2. Rate limit check (10 req/min/IP)
  ├── 3. Download PDF from Storage
  ├── 4. Validate: header %PDF-, size ≤ 10MB
  ├── 5. SHA-256 hash
  ├── 6. Text extraction (pdfjs-dist)
  │     ├── Polyfills: DOMMatrix, ImageData, Path2D
  │     └── Worker: pdfjs-dist/legacy/build/pdf.worker.mjs
  ├── 7. Metadata extraction (regex):
  │     ├── extractStudentName() → labelled, headings, uppercase
  │     └── extractCourse() → labelled, normalized
  ├── 8. Annotation parsing (regex):
  │     ├── splitAnnotationBlocks() → by DD/MM/YYYY
  │     ├── classifyAnnotation() → Negativa/Positiva/Información
  │     └── Dedup: (page, type, date, text)
  ├── 9. Student matching:
  │     ├── Exact name (ilike) → 0.99 confidence
  │     ├── NFD-stripped → 0.94
  │     ├── Word overlap ≥50% → variable
  │     └── Course fallback
  ├── 10. Letter suggestion via RPC get_suggested_letter_type()
  └── 11. Persist to document_analyses table
```

### Step 2: Confirm (POST /api/process-disciplinary-pdf/confirm)

```
  ├── 1. requireAuth + validation
  ├── 2. Idempotency check (storagePath + tenantId)
  ├── 3. Student belongs to tenant
  ├── 4. Generate process number via RPC (DP-YYYY-NNNN)
  └── 5. Insert:
        ├── disciplinary_processes (status: 'draft')
        ├── disciplinary_process_files
        ├── disciplinary_annotations_detected
        └── document_analyses (confirmed)
```

## Known Issues

| Issue | Status |
|-------|--------|
| Vercel 500: pdf.worker.mjs not included | ✅ Fixed (vercel.json includeFiles) |
| Node polyfills required (pdfjs-dom) | ⚡ Mitigated (as unknown as typeof) |
| StudentId TEXT vs UUID in inspectorate_records | ❌ Open |
