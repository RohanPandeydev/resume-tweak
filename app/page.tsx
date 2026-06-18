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

type Job = {
  title: string;
  company: string | null;
  site: string;
  url: string;
  fitScore: number;
  whyFit: string;
  matchedSkills: string[];
  gaps: string[];
  salaryFit: string;
};

type JobResult = {
  profileSummary: string;
  marketSalaryInsight: string;
  recommendedTitles: string[];
  jobs: Job[];
  overallAdvice: string;
  totalFound: number;
};

export default function Home() {
  const [tab, setTab] = useState<"tailor" | "discover">("tailor");

  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // tailor state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  // discover state
  const [desiredPackage, setDesiredPackage] = useState("");
  const [location, setLocation] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [jobs, setJobs] = useState<JobResult | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setJobsError("");
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

  async function discover() {
    setJobsError("");
    setJobs(null);
    if (!resume.trim()) {
      setJobsError("Upload or paste your resume first.");
      return;
    }
    setJobsLoading(true);
    try {
      const res = await fetch("/api/find-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, desiredPackage, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setJobs(data as JobResult);
      setTimeout(
        () => document.getElementById("jobresults")?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    } catch (e) {
      setJobsError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setJobsLoading(false);
    }
  }

  const scoreColor = !result
    ? ""
    : result.matchScore >= 75
    ? "good"
    : result.matchScore >= 45
    ? "mid"
    : "low";

  function fitClass(score: number) {
    return score >= 75 ? "good" : score >= 45 ? "mid" : "low";
  }
  function salaryClass(s: string) {
    if (s.startsWith("Likely meets") || s.startsWith("Likely above")) return "good";
    if (s.startsWith("Possibly below")) return "low";
    return "mid";
  }

  return (
    <main className="wrap">
      <header className="header">
        <h1>Resume Tweak</h1>
        <p>
          Upload your resume once. Tailor it to a specific job, or discover live jobs
          that fit you and your target salary.
        </p>
      </header>

      {/* Resume input — shared by both modes */}
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
          placeholder="…or paste your resume text here."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={tab === "tailor" ? "active" : ""}
          onClick={() => setTab("tailor")}
        >
          Tailor to a job
        </button>
        <button
          className={tab === "discover" ? "active" : ""}
          onClick={() => setTab("discover")}
        >
          Find jobs for me
        </button>
      </div>

      {tab === "tailor" && (
        <>
          <div className="field">
            <label htmlFor="jd">Job description</label>
            <textarea
              id="jd"
              placeholder="Paste the full job posting / description here…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div className="actions">
            <button className="analyze" onClick={analyze} disabled={loading || parsing}>
              {loading ? "Analyzing…" : "Analyze my resume"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      )}

      {tab === "discover" && (
        <>
          <div className="grid">
            <div className="field">
              <label htmlFor="pkg">Desired package / salary (optional)</label>
              <input
                id="pkg"
                className="text-input"
                placeholder="e.g. $120k, ₹25 LPA, €70k"
                value={desiredPackage}
                onChange={(e) => setDesiredPackage(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loc">Location (optional)</label>
              <input
                id="loc"
                className="text-input"
                placeholder="e.g. Bangalore, Remote, US, GB"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="actions">
            <button className="analyze" onClick={discover} disabled={jobsLoading || parsing}>
              {jobsLoading ? "Searching live jobs…" : "Find jobs that fit me"}
            </button>
          </div>
          {jobsError && <p className="error">{jobsError}</p>}
        </>
      )}

      {/* Tailor results */}
      {tab === "tailor" && result && (
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

      {/* Discover results */}
      {tab === "discover" && jobs && (
        <section className="results" id="jobresults">
          <div className="card highlight">
            <h2>
              <span className="dot blue" /> Your best-fit roles
            </h2>
            <p className="summary">{jobs.profileSummary}</p>
            <div className="chips" style={{ marginTop: 12 }}>
              {jobs.recommendedTitles.map((t, i) => (
                <span className="chip" key={i}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>
              <span className="dot green" /> Salary reality check
            </h2>
            <p className="summary">{jobs.marketSalaryInsight}</p>
          </div>

          <h2 className="section-title">
            {jobs.jobs.length} matched live jobs (of {jobs.totalFound} found)
          </h2>

          {jobs.jobs.map((j, i) => (
            <div className="card job" key={i}>
              <div className="job-head">
                <div>
                  <a href={j.url} target="_blank" rel="noopener noreferrer" className="job-title">
                    {j.title}
                  </a>
                  <div className="job-meta">
                    {j.company ? `${j.company} · ` : ""}
                    {j.site}
                  </div>
                </div>
                <div className={`fit-badge ${fitClass(j.fitScore)}`}>{j.fitScore}% fit</div>
              </div>
              <p className="summary" style={{ marginTop: 8 }}>
                {j.whyFit}
              </p>
              <div className="job-tags">
                <span className={`pill ${salaryClass(j.salaryFit)}`}>💰 {j.salaryFit}</span>
                {j.matchedSkills.slice(0, 6).map((s, k) => (
                  <span className="pill" key={k}>
                    ✓ {s}
                  </span>
                ))}
                {j.gaps.slice(0, 3).map((s, k) => (
                  <span className="pill gap" key={`g${k}`}>
                    △ {s}
                  </span>
                ))}
              </div>
              <a href={j.url} target="_blank" rel="noopener noreferrer" className="apply-link">
                View posting →
              </a>
            </div>
          ))}

          <div className="card">
            <h2>
              <span className="dot blue" /> Advice
            </h2>
            <p className="summary">{jobs.overallAdvice}</p>
          </div>
        </section>
      )}

      <footer className="foot">
        Resume analysis via Groq · live jobs via TinyFish Search. Your data is used only
        to generate results and isn&apos;t stored.
      </footer>
    </main>
  );
}
