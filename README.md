# Resume Tweak

A web app that uses an LLM (via Groq) to compare your resume against a specific job
description and tell you **exactly what to add and remove** to match the job — tuned for
real recruiters and ATS (Applicant Tracking System) screening.

## What it does

1. **Upload your resume as a PDF** (drag & drop or browse) — the text is extracted
   automatically and shown in an editable box. You can also just paste text.
2. **Paste the job description.**
3. **Analyze** — and you get:

- **Match score (0–100)** + a verdict (Strong match / Good with gaps / Stretch / Not a fit yet)
- **Honest summary** of your fit for this specific role
- **Do these first** — the 1–3 highest-impact changes, in priority order
- **Add these** — skills/experience to add, *with which resume section to put them in* and why
- **Remove or de-emphasize** — what's distracting for this role
- **Missing keywords** — exact terms from the posting you're missing, flagged
  `critical` vs `nice-to-have` (matters for ATS keyword matching)
- **Bullet rewrites** — before/after rewrites of your real resume lines, quantified
  and using the job's exact terminology
- **ATS & formatting tips** — specific to your resume

The analysis follows recruiter best practices: exact-terminology keyword matching,
frequency-based prioritization, anchoring every suggestion to real work (never
fabricating experience), and ATS-friendly single-column formatting.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints (e.g. http://localhost:3000), upload your resume PDF, paste the
job description, and click **Analyze my resume**.

## Configuration

Your Groq API key lives in `.env.local`:

```
GROQ_API_KEY=your_key_here
```

The model is set in `app/api/analyze/route.ts` (`llama-3.3-70b-versatile`). Swap it for
any Groq-supported model.

## Tech

- **Next.js** (App Router) + React
- **Vercel AI SDK** (`ai` + `@ai-sdk/groq`) with structured output via Zod
- **unpdf** for serverless PDF text extraction (zero native deps, works on Vercel)

## Project structure

```
app/
  page.tsx                 UI: PDF upload + paste, results
  layout.tsx
  globals.css              styling
  api/analyze/route.ts     LLM analysis (Groq + structured output)
  api/parse-pdf/route.ts   PDF -> text (unpdf)
```

## Notes

- Scanned/image-only PDFs have no selectable text — the app will tell you to paste
  the text instead.
- Your resume and the job description are sent to Groq only to generate the analysis.
  Nothing is stored server-side.
