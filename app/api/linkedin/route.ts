import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({
  headlines: z
    .array(z.string())
    .max(3)
    .describe(
      "3 LinkedIn headline options, each 150-220 characters. Format: 1 primary title + 2-3 supporting keywords + a value proposition. Headline + current role drive ~60% of recruiter search ranking."
    ),
  about: z
    .string()
    .describe(
      "An optimized About section under 2,600 characters. The FIRST 2-3 lines (~250 chars) must hook the reader before LinkedIn's 'see more' cut-off. Write in first person, weave in 8-12 relevant keywords naturally, and end with a clear call to action."
    ),
  aboutHook: z
    .string()
    .describe("The first ~250 characters of the About section, shown before 'see more'"),
  topSkills: z
    .array(z.string())
    .max(15)
    .describe(
      "10-15 skills ordered by relevance to the target role — these drive recruiter search matching"
    ),
  recruiterKeywords: z
    .array(z.string())
    .describe(
      "Exact terms recruiters search for these roles (e.g. boolean searches like 'React AND TypeScript'). Ensure these appear across the profile."
    ),
  experienceTips: z
    .array(
      z.object({
        area: z.string().describe("Which part of the profile"),
        tip: z.string().describe("Specific, actionable improvement"),
      })
    )
    .describe("Concrete improvements for the Experience/Featured sections"),
  profileTips: z
    .array(z.string())
    .describe(
      "Profile completeness & ranking tips: custom URL, banner, featured section, certifications, recommendations, activity/posting, Open-to-work, etc."
    ),
  openToWorkTitles: z
    .array(z.string())
    .describe("Job titles to set in LinkedIn's 'Open to work' for best recruiter matching"),
});

export async function POST(req: Request) {
  try {
    const { resume, targetRole, currentHeadline, currentAbout } = await req.json();
    if (!resume?.trim()) {
      return Response.json(
        { error: "Please add your resume first." },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema,
      system:
        "You are a LinkedIn personal-branding expert who optimizes profiles for 2026 recruiter search. " +
        "Key facts you apply: (1) Headline + current position account for ~60% of search ranking — make them keyword-rich, 150+ chars. " +
        "(2) The About section's first ~250 chars must hook before 'see more'; weave in 8-12 keywords across 2,600 chars max. " +
        "(3) Skills section should list 10-15 skills ordered by relevance — they drive recruiter matching. " +
        "(4) LinkedIn's AI search ranks on semantic depth, not just keyword stuffing — keep it authentic and specific. " +
        "(5) Certifications and recent activity boost search appearances. " +
        "Only use facts present in the resume — never invent titles, employers, or achievements.",
      prompt:
        `RESUME:\n${resume}\n\n` +
        (targetRole ? `TARGET ROLE / INDUSTRY: ${targetRole}\n` : "") +
        (currentHeadline ? `CURRENT HEADLINE: ${currentHeadline}\n` : "") +
        (currentAbout ? `CURRENT ABOUT SECTION:\n${currentAbout}\n` : "") +
        `\nProduce an optimized LinkedIn profile: headlines, About section (with its hook), ordered ` +
        `top skills, recruiter keywords, experience/featured improvements, profile completeness tips, ` +
        `and Open-to-work titles. Tailor everything to the target role if given.`,
    });

    return Response.json(object);
  } catch (err) {
    console.error("linkedin error:", err);
    return Response.json(
      { error: "Couldn't generate LinkedIn optimization. Please try again." },
      { status: 500 }
    );
  }
}
