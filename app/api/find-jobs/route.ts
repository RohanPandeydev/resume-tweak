import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// --- Step 1: derive an ideal job-search profile from the resume ---
const profileSchema = z.object({
  seniority: z.string().describe("e.g. Junior, Mid, Senior, Staff"),
  coreSkills: z.array(z.string()).describe("Top skills to search on"),
  suggestedTitles: z
    .array(z.string())
    .max(6)
    .describe("Job titles that realistically fit this candidate"),
  searchQueries: z
    .array(z.string())
    .max(4)
    .describe(
      "3-4 web search queries to find live job postings on job boards. " +
        "Include role + key skills + the word 'jobs'/'hiring' and, when given, the location. " +
        "You may use site: operators for linkedin.com/jobs, indeed.com, wellfound.com, etc."
    ),
});

// --- Step 2: rank the live postings found against the candidate ---
const rankingSchema = z.object({
  profileSummary: z
    .string()
    .describe("1-2 sentences on the kind of roles this candidate fits best"),
  marketSalaryInsight: z
    .string()
    .describe(
      "Realistic market pay range for these roles in the given location, and an honest take on whether the candidate's desired package is achievable. State it's an estimate."
    ),
  recommendedTitles: z
    .array(z.string())
    .describe("The job titles the candidate should target, best first"),
  jobs: z
    .array(
      z.object({
        title: z.string(),
        company: z.string().nullable().describe("Company if identifiable, else null"),
        site: z.string().describe("Source site, e.g. linkedin.com"),
        url: z.string().describe("The EXACT url from the provided listings — never invent one"),
        fitScore: z.number().min(0).max(100),
        whyFit: z.string().describe("Why this role suits the candidate"),
        matchedSkills: z.array(z.string()),
        gaps: z.array(z.string()).describe("What the candidate may be missing"),
        salaryFit: z
          .enum([
            "Likely meets your target",
            "Possibly below your target",
            "Likely above your ask",
            "Unknown",
          ])
          .describe("Estimated fit vs the candidate's desired package"),
      })
    )
    .describe("Ranked job recommendations, best fit first"),
  overallAdvice: z
    .string()
    .describe("Practical next-step advice on targeting and compensation"),
});

type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  site_name: string;
};

async function tinyfishSearch(query: string, location: string): Promise<SearchResult[]> {
  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", query);
  url.searchParams.set("location", location);
  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.TINYFISH_API_KEY ?? "" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

export async function POST(req: Request) {
  try {
    const { resume, desiredPackage, location } = await req.json();
    if (!resume?.trim()) {
      return Response.json(
        { error: "Please provide your resume first." },
        { status: 400 }
      );
    }
    const loc = (location?.trim() as string) || "";
    const countryCode = loc.length === 2 ? loc.toUpperCase() : "US";

    // Step 1 — profile + search queries
    const { object: profile } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: profileSchema,
      system:
        "You are a career coach. From a resume, infer the best-fit roles and craft effective " +
        "job-board search queries. Be realistic about seniority based on years of experience.",
      prompt:
        `RESUME:\n${resume}\n\n` +
        (loc ? `PREFERRED LOCATION: ${loc}\n` : "") +
        (desiredPackage ? `DESIRED PACKAGE / SALARY: ${desiredPackage}\n` : "") +
        `\nProduce search queries that will surface live job postings matching this candidate.`,
    });

    // Step 2 — run the searches (in parallel) and collect listings
    const queries = profile.searchQueries.slice(0, 4);
    const batches = await Promise.all(
      queries.map((q) => tinyfishSearch(q, countryCode))
    );

    const seen = new Set<string>();
    const listings: SearchResult[] = [];
    for (const batch of batches) {
      for (const r of batch.slice(0, 8)) {
        if (!r?.url || seen.has(r.url)) continue;
        seen.add(r.url);
        listings.push({
          title: r.title,
          snippet: r.snippet,
          url: r.url,
          site_name: r.site_name,
        });
      }
    }

    if (listings.length === 0) {
      return Response.json(
        { error: "No live postings found right now. Try adding a location or broadening your resume." },
        { status: 404 }
      );
    }

    const listingsText = listings
      .slice(0, 20)
      .map(
        (l, i) =>
          `[${i + 1}] ${l.title}\n    site: ${l.site_name}\n    url: ${l.url}\n    snippet: ${l.snippet}`
      )
      .join("\n\n");

    // Step 3 — rank listings against the candidate
    const { object: ranking } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: rankingSchema,
      system:
        "You are an expert tech recruiter. Rank real job listings against a candidate's resume. " +
        "Only use the listings provided and their EXACT urls — never fabricate a posting or url. " +
        "Be honest about fit and about realistic compensation for the location. " +
        "Salary figures are estimates; say so.",
      prompt:
        `CANDIDATE RESUME:\n${resume}\n\n` +
        (loc ? `PREFERRED LOCATION: ${loc}\n` : "") +
        (desiredPackage ? `CANDIDATE'S DESIRED PACKAGE: ${desiredPackage}\n` : "") +
        `\nLIVE JOB LISTINGS FOUND:\n${listingsText}\n\n` +
        `Rank the best-fitting listings for this candidate (best first). For each, explain the fit, ` +
        `matched skills, gaps, and whether it likely meets their desired package. Then give a market ` +
        `salary insight for the location and overall targeting advice.`,
    });

    return Response.json({ ...ranking, totalFound: listings.length });
  } catch (err) {
    console.error("find-jobs error:", err);
    return Response.json(
      { error: "Something went wrong while finding jobs. Please try again." },
      { status: 500 }
    );
  }
}
