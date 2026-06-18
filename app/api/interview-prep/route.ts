import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({
  questions: z
    .array(
      z.object({
        category: z
          .enum(["Technical", "Behavioral", "Gap / risk", "Role-specific"])
          .describe("Type of question"),
        question: z.string().describe("A question the interviewer is likely to ask"),
        whyAsked: z.string().describe("Why an interviewer for THIS job would ask it"),
        howToAnswer: z
          .string()
          .describe(
            "Concrete guidance on how THIS candidate should answer, referencing their real background"
          ),
      })
    )
    .describe("8-12 likely interview questions, mixed across categories"),
  questionsToAskThem: z
    .array(z.string())
    .describe("3-5 smart questions the candidate should ask the interviewer"),
  prepTips: z.array(z.string()).describe("Focused prep tips for this specific role"),
});

export async function POST(req: Request) {
  try {
    const { resume, jobDescription } = await req.json();
    if (!resume?.trim() || !jobDescription?.trim()) {
      return Response.json(
        { error: "Need both your resume and the job description." },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema,
      system:
        "You are a senior hiring manager preparing realistic interview questions. " +
        "Tie questions to the specific job description AND to gaps/strengths visible in the resume. " +
        "Gap/risk questions should probe the candidate's weakest areas for this role. " +
        "Answer guidance must reference the candidate's actual experience, never fabricated achievements.",
      prompt:
        `=== JOB DESCRIPTION ===\n${jobDescription}\n\n` +
        `=== CANDIDATE RESUME ===\n${resume}\n\n` +
        `Generate the most likely interview questions for this candidate applying to this job, ` +
        `with why each is asked and how this candidate should answer. Include gap-probing questions, ` +
        `smart questions for them to ask, and prep tips.`,
    });

    return Response.json(object);
  } catch (err) {
    console.error("interview-prep error:", err);
    return Response.json(
      { error: "Couldn't generate interview prep. Please try again." },
      { status: 500 }
    );
  }
}
