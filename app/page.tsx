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

type Prep = {
  questions: {
    category: string;
    question: string;
    whyAsked: string;
    howToAnswer: string;
  }[];
  questionsToAskThem: string[];
  prepTips: string[];
};

type LinkedIn = {
  headlines: string[];
  about: string;
  aboutHook: string;
  topSkills: string[];
  recruiterKeywords: string[];
  experienceTips: { area: string; tip: string }[];
  profileTips: string[];
  openToWorkTitles: string[];
};

export default function Home() {
  const [tab, setTab] = useState<"tailor" | "discover" | "linkedin">("tailor");

  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // JD from URL
  const [jdUrl, setJdUrl] = useState("");
  const [fetchingJd, setFetchingJd] = useState(false);

  // tailor state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  // cover letter
  const [coverTone, setCoverTone] = useState("confident");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  // interview prep
  const [prepLoading, setPrepLoading] = useState(false);
  const [prep, setPrep] = useState<Prep | null>(null);

  // discover state
  const [desiredPackage, setDesiredPackage] = useState("");
  const [location, setLocation] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [jobs, setJobs] = useState<JobResult | null>(null);

  // linkedin state
  const [targetRole, setTargetRole] = useState("");
  const [currentHeadline, setCurrentHeadline] = useState("");
  const [currentAbout, setCurrentAbout] = useState("");
  const [liLoading, setLiLoading] = useState(false);
  const [liError, setLiError] = useState("");
  const [li, setLi] = useState<LinkedIn | null>(null);

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

  async function fetchJd() {
    setError("");
    if (!jdUrl.trim()) return;
    setFetchingJd(true);
    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't fetch the URL.");
      setJobDescription(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't fetch the URL.");
    } finally {
      setFetchingJd(false);
    }
  }

  async function analyze() {
    setError("");
    setResult(null);
    setCoverLetter("");
    setPrep(null);
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

  async function genCover() {
    setCoverLoading(true);
    setCoverLetter("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, tone: coverTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setCoverLetter(data.coverLetter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the letter.");
    } finally {
      setCoverLoading(false);
    }
  }

  async function genPrep() {
    setPrepLoading(true);
    setPrep(null);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setPrep(data as Prep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate prep.");
    } finally {
      setPrepLoading(false);
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

  async function genLinkedin() {
    setLiError("");
    setLi(null);
    if (!resume.trim()) {
      setLiError("Upload or paste your resume first.");
      return;
    }
    setLiLoading(true);
    try {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, targetRole, currentHeadline, currentAbout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setLi(data as LinkedIn);
      setTimeout(
        () => document.getElementById("liresults")?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    } catch (e) {
      setLiError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLiLoading(false);
    }
  }

  function tailorToJob(job: Job) {
    setTab("tailor");
    setResult(null);
    setCoverLetter("");
    setPrep(null);
    setJdUrl(job.url);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  function download(text: string, name: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const scoreColor = !result
    ? ""
    : result.matchScore >= 75
    ? "good"
    : result.matchScore >= 45
    ? "mid"
    : "low";

  const fitClass = (s: number) => (s >= 75 ? "good" : s >= 45 ? "mid" : "low");
  const salaryClass = (s: string) =>
    s.startsWith("Likely meets") || s.startsWith("Likely above")
      ? "good"
      : s.startsWith("Possibly below")
      ? "low"
      : "mid";

  return (
    <main className="wrap">
      <header className="header">
        <h1>Resume Tweak</h1>
        <p>
          Your end-to-end job-apply copilot. Tailor your resume to any posting, write a
          cover letter, prep for the interview, optimize your LinkedIn — or discover live
          jobs that fit you.
        </p>
      </header>

      {/* Resume input — shared */}
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

      <div className="tabs">
        <button className={tab === "tailor" ? "active" : ""} onClick={() => setTab("tailor")}>
          Tailor to a job
        </button>
        <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>
          Find jobs for me
        </button>
        <button className={tab === "linkedin" ? "active" : ""} onClick={() => setTab("linkedin")}>
          LinkedIn optimizer
        </button>
      </div>

      {tab === "tailor" && (
        <>
          <div className="field">
            <label htmlFor="jd">Job description</label>
            <div className="url-row">
              <input
                className="text-input"
                placeholder="Paste a job URL to auto-fill (or paste text below)…"
                value={jdUrl}
                onChange={(e) => setJdUrl(e.target.value)}
              />
              <button className="ghost-btn" onClick={fetchJd} disabled={fetchingJd || !jdUrl.trim()}>
                {fetchingJd ? "Fetching…" : "Fetch"}
              </button>
            </div>
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

      {tab === "linkedin" && (
        <>
          <div className="field">
            <label htmlFor="role">Target role / industry (optional)</label>
            <input
              id="role"
              className="text-input"
              placeholder="e.g. Senior Frontend Engineer at fintech startups"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="curhead">Your current LinkedIn headline (optional)</label>
            <input
              id="curhead"
              className="text-input"
              placeholder="Paste your current headline so I can improve it"
              value={currentHeadline}
              onChange={(e) => setCurrentHeadline(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="curabout">Your current About section (optional)</label>
            <textarea
              id="curabout"
              style={{ minHeight: 120 }}
              placeholder="Paste your current About section to rewrite it (leave blank to generate from scratch)"
              value={currentAbout}
              onChange={(e) => setCurrentAbout(e.target.value)}
            />
          </div>
          <div className="actions">
            <button className="analyze" onClick={genLinkedin} disabled={liLoading || parsing}>
              {liLoading ? "Optimizing…" : "Optimize my LinkedIn"}
            </button>
          </div>
          {liError && <p className="error">{liError}</p>}
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

          {/* Apply-ready actions */}
          <div className="card highlight">
            <h2>
              <span className="dot blue" /> Apply-ready next steps
            </h2>
            <div className="step-row">
              <div className="tone-select">
                <span>Cover letter tone:</span>
                <select value={coverTone} onChange={(e) => setCoverTone(e.target.value)}>
                  <option value="confident">Confident &amp; concise</option>
                  <option value="enthusiastic">Warm &amp; enthusiastic</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <button className="ghost-btn" onClick={genCover} disabled={coverLoading}>
                {coverLoading ? "Writing…" : "✍️ Generate cover letter"}
              </button>
              <button className="ghost-btn" onClick={genPrep} disabled={prepLoading}>
                {prepLoading ? "Preparing…" : "🎤 Interview prep"}
              </button>
            </div>
          </div>

          {coverLetter && (
            <div className="card">
              <h2>
                <span className="dot green" /> Your cover letter
              </h2>
              <pre className="letter">{coverLetter}</pre>
              <div className="step-row">
                <button className="ghost-btn" onClick={() => copy(coverLetter)}>
                  Copy
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => download(coverLetter, "cover-letter.txt")}
                >
                  Download
                </button>
              </div>
            </div>
          )}

          {prep && (
            <div className="card">
              <h2>
                <span className="dot blue" /> Interview prep
              </h2>
              {prep.questions.map((q, i) => (
                <div className="item" key={i}>
                  <div className="lead">
                    <span className="tag">{q.category}</span> {q.question}
                  </div>
                  <div className="reason">
                    <strong>Why:</strong> {q.whyAsked}
                  </div>
                  <div className="reason">
                    <strong>How to answer:</strong> {q.howToAnswer}
                  </div>
                </div>
              ))}
              <h3 className="subhead">Smart questions to ask them</h3>
              <ul className="tips">
                {prep.questionsToAskThem.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <h3 className="subhead">Prep tips</h3>
              <ul className="tips">
                {prep.prepTips.map((t, i) => (
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
              <div className="step-row">
                <a href={j.url} target="_blank" rel="noopener noreferrer" className="apply-link">
                  View posting →
                </a>
                <button className="ghost-btn" onClick={() => tailorToJob(j)}>
                  Tailor my resume to this
                </button>
              </div>
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

      {/* LinkedIn results */}
      {tab === "linkedin" && li && (
        <section className="results" id="liresults">
          <div className="card highlight">
            <h2>
              <span className="dot blue" /> Headline options
            </h2>
            <p className="summary" style={{ marginBottom: 12 }}>
              Headline + current role drive ~60% of recruiter search ranking. Pick one:
            </p>
            {li.headlines.map((h, i) => (
              <div className="item" key={i}>
                <div className="lead">{h}</div>
                <div className="step-row">
                  <span className="reason">{h.length} chars</span>
                  <button className="ghost-btn" onClick={() => copy(h)}>
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>
              <span className="dot green" /> About section
            </h2>
            <div className="reason" style={{ marginBottom: 8 }}>
              Hook (shown before “see more”): <em>{li.aboutHook}</em>
            </div>
            <pre className="letter">{li.about}</pre>
            <div className="step-row">
              <span className="reason">{li.about.length} / 2,600 chars</span>
              <button className="ghost-btn" onClick={() => copy(li.about)}>
                Copy About
              </button>
            </div>
          </div>

          <div className="card">
            <h2>
              <span className="dot blue" /> Top skills (in order)
            </h2>
            <div className="chips">
              {li.topSkills.map((s, i) => (
                <span className="chip" key={i}>
                  {i + 1}. {s}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>
              <span className="dot yellow" /> Recruiter search keywords
            </h2>
            <div className="chips">
              {li.recruiterKeywords.map((k, i) => (
                <span className="chip crit" key={i}>
                  {k}
                </span>
              ))}
            </div>
          </div>

          {li.experienceTips?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot green" /> Experience &amp; Featured
              </h2>
              {li.experienceTips.map((t, i) => (
                <div className="item" key={i}>
                  <div className="lead">{t.area}</div>
                  <div className="reason">{t.tip}</div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h2>
              <span className="dot blue" /> Profile ranking tips
            </h2>
            <ul className="tips">
              {li.profileTips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          {li.openToWorkTitles?.length > 0 && (
            <div className="card">
              <h2>
                <span className="dot green" /> Set these in “Open to work”
              </h2>
              <div className="chips">
                {li.openToWorkTitles.map((t, i) => (
                  <span className="chip" key={i}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="foot">
        Resume analysis &amp; writing via Groq · live jobs &amp; page reading via TinyFish.
        Your data is used only to generate results and isn&apos;t stored.
      </footer>
    </main>
  );
}
