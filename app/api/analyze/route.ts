import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const analysisSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall fit of the resume for this job, 0-100"),
  verdict: z
    .enum(["Strong match", "Good with gaps", "Stretch", "Not a fit yet"])
    .describe("A short verdict label"),
  summary: z
    .string()
    .describe(
      "2-3 sentence honest assessment of fit, written directly to the candidate"
    ),
  topPriorities: z
    .array(z.string())
    .max(3)
    .describe(
      "The 1-3 highest-impact changes to make first, in priority order"
    ),
  add: z
    .array(
      z.object({
        item: z.string().describe("The skill, experience, or content to add"),
        reason: z
          .string()
          .describe("Why it matters for THIS job, citing the job description"),
        whereToPlace: z
          .string()
          .describe(
            "Which resume section it belongs in (e.g. Skills, Summary, a specific role's bullets)"
          ),
      })
    )
    .describe("Things to ADD, only if realistic given the candidate's background"),
  remove: z
    .array(
      z.object({
        item: z.string().describe("What to remove or de-emphasize"),
        reason: z.string().describe("Why it distracts from this specific role"),
      })
    )
    .describe("Things to REMOVE or de-emphasize"),
  missingKeywords: z
    .array(
      z.object({
        keyword: z
          .string()
          .describe("Exact term/phrase from the job description, matched verbatim"),
        importance: z
          .enum(["critical", "nice-to-have"])
          .describe("How central this keyword is to the job"),
      })
    )
    .describe(
      "Important keywords present in the job description but missing from the resume (use exact wording for ATS)"
    ),
  rewriteSuggestions: z
    .array(
      z.object({
        original: z.string().describe("An existing line/phrase from the resume"),
        improved: z
          .string()
          .describe(
            "A stronger, quantified version that uses the job's exact terminology"
          ),
      })
    )
    .describe("Concrete before/after rewrites of real resume bullets"),
  atsTips: z
    .array(z.string())
    .describe(
      "Formatting/ATS-readiness tips specific to what you saw in this resume"
    ),
});

const SYSTEM = `You are a senior technical recruiter and professional resume coach with 15+ years of experience reviewing resumes against live job postings and ATS (Applicant Tracking System) screening.

Follow these evidence-based rules:
1. Be specific to the provided job description. Never give generic advice that could apply to any job.
2. Use EXACT terminology from the job description. If it says "Snowflake", recommend the word "Snowflake", not "cloud data platform". ATS matches literal strings.
3. Prioritize by frequency and placement: terms repeated in the posting, or listed under "requirements/must-have", matter most. Mark those "critical".
4. Anchor every keyword to real work. Never tell the candidate to claim experience they don't have. Only suggest additions that are plausible given their existing background, or clearly frame them as gaps to address (e.g. via a project or course).
5. Quantify rewrites where possible (impact, scale, %, $, time saved) and lead with strong action verbs.
6. Favor a single-column, standard-heading (Summary, Skills, Experience, Education), ATS-friendly structure. Flag anything that breaks ATS parsing.
7. Be honest. If the resume is a stretch for this role, say so and give the candidate the most realistic path forward.`;

export async function POST(req: Request) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume?.trim() || !jobDescription?.trim()) {
      return Response.json(
        { error: "Please provide both your resume and the job description." },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: analysisSchema,
      system: SYSTEM,
      prompt:
        `=== JOB DESCRIPTION ===\n${jobDescription}\n\n` +
        `=== CANDIDATE'S CURRENT RESUME ===\n${resume}\n\n` +
        `Analyze how well this resume fits this specific job. Identify the highest-impact ` +
        `changes first, exactly what to add (and where), what to remove or de-emphasize, ` +
        `which exact keywords are missing (and how critical each is), concrete bullet rewrites, ` +
        `and ATS formatting tips. Be precise and honest.`,
    });

    return Response.json(object);
  } catch (err) {
    console.error("Analyze error:", err);
    return Response.json(
      { error: "Something went wrong while analyzing. Please try again." },
      { status: 500 }
    );
  }
}
