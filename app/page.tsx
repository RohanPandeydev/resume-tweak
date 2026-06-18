"use client";

import { useRef, useState } from "react";

type Analysis = {
  matchScore: number;
  verdict: string;
  summary: string;
  topPriorities: string[];
  add: { item: string; reason: string; whereToPlace: string }[];
  remove: { item: string; reason: string }[];
  missingKeywords: { keyword: string; importance: "critical" | "nice-to-have" }[];
  rewriteSuggestions: { original: string; improved: string }[];
  atsTips: string[];
};

export default function Home() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setParsing(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read the PDF.");
      setResume(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the PDF.");
      setFileName("");
    } finally {
      setParsing(false);
    }
  }

  async function analyze() {
    setError("");
    setResult(null);
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Please add both your resume and the job description.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data as Analysis);
      setTimeout(
        () => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor =
    !result ? "" : result.matchScore >= 75 ? "good" : result.matchScore >= 45 ? "mid" : "low";

  return (
    <main className="wrap">
      <header className="header">
        <h1>Resume Tweak</h1>
        <p>
          Upload your resume and paste the job you&apos;re applying to. Get exactly
          what to add and remove to match it — tuned for real recruiters and ATS.
        </p>
      </header>

      <div className="grid">
        <div className="field">
          <label htmlFor="resume">Your resume</label>

          <div
            className={`dropzone ${dragging ? "drag" : ""}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0] || undefined)}
            />
            {parsing ? (
              <span>Reading {fileName}…</span>
            ) : fileName ? (
              <span>
                ✓ Loaded <strong>{fileName}</strong> — click to replace
              </span>
            ) : (
              <span>
                <strong>Drop your resume PDF here</strong> or click to browse
              </span>
            )}
          </div>

          <textarea
            id="resume"
            placeholder="…or paste your resume text here. (PDF text appears here after upload — you can edit it.)"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="jd">Job description</label>
          <div className="dropzone ghost">Paste the full job posting below ↓</div>
          <textarea
            id="jd"
            placeholder="Paste the full job posting / description here…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="actions">
        <button className="analyze" onClick={analyze} disabled={loading || parsing}>
          {loading ? "Analyzing…" : "Analyze my resume"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="results" id="results">
          <div className="score-card">
            <div
              className={`score-ring ${scoreColor}`}
              style={{ ["--val" as string]: result.matchScore } as React.CSSProperties}
            >
              <span>{result.matchScore}%</span>
            </div>
            <div>
              <div className={`verdict ${scoreColor}`}>{result.verdict}</div>
              <p className="summary">{result.summary}</p>
            </div>
          </div>

          {result.topPriorities?.length > 0 && (
            <div className="card highlight">
              <h2>
                <span className="dot blue" /> Do these first
              </h2>
              <ol className="priorities">
                {result.topPriorities.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
          )}

          {result.add?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot green" /> Add these
              </h2>
              {result.add.map((a, i) => (
                <div className="item" key={i}>
                  <div className="lead">
                    {a.item} <span className="tag">{a.whereToPlace}</span>
                  </div>
                  <div className="reason">{a.reason}</div>
                </div>
              ))}
            </div>
          )}

          {result.remove?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot red" /> Remove or de-emphasize
              </h2>
              {result.remove.map((r, i) => (
                <div className="item" key={i}>
                  <div className="lead">{r.item}</div>
                  <div className="reason">{r.reason}</div>
                </div>
              ))}
            </div>
          )}

          {result.missingKeywords?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot yellow" /> Missing keywords (for ATS)
              </h2>
              <div className="chips">
                {result.missingKeywords.map((k, i) => (
                  <span className={`chip ${k.importance === "critical" ? "crit" : ""}`} key={i}>
                    {k.keyword}
                    {k.importance === "critical" && <em>critical</em>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.rewriteSuggestions?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot blue" /> Bullet rewrites
              </h2>
              {result.rewriteSuggestions.map((r, i) => (
                <div className="rewrite" key={i}>
                  <div className="old">
                    <span className="label">Before</span>
                    {r.original}
                  </div>
                  <div className="new">
                    <span className="label">After</span>
                    {r.improved}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.atsTips?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot yellow" /> ATS &amp; formatting tips
              </h2>
              <ul className="tips">
                {result.atsTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="foot">
        Your data is sent to Groq only to generate this analysis. Nothing is stored.
      </footer>
    </main>
  );
}
