import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { resume, jobDescription, tone } = await req.json();
    if (!resume?.trim() || !jobDescription?.trim()) {
      return Response.json(
        { error: "Need both your resume and the job description." },
        { status: 400 }
      );
    }

    const toneLabel =
      tone === "enthusiastic"
        ? "warm and enthusiastic"
        : tone === "formal"
        ? "formal and professional"
        : "confident and concise";

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system:
        "You are an expert career writer. Write a tailored, truthful cover letter that connects the " +
        "candidate's REAL experience to the specific job. Rules: " +
        "1) Only use facts present in the resume — never invent employers, titles, or metrics. " +
        "2) Mirror key terminology from the job description. " +
        "3) 3-4 short paragraphs, ~250-350 words. " +
        "4) Open with a specific hook, not 'I am writing to apply'. " +
        "5) No clichés like 'team player' or 'detail-oriented' unless backed by evidence. " +
        "6) Use [Hiring Manager] / [Company] placeholders only if the name isn't given.",
      prompt:
        `Write a ${toneLabel} cover letter.\n\n` +
        `=== JOB DESCRIPTION ===\n${jobDescription}\n\n` +
        `=== CANDIDATE RESUME ===\n${resume}\n\n` +
        `Return only the cover letter text, ready to send.`,
    });

    return Response.json({ coverLetter: text.trim() });
  } catch (err) {
    console.error("cover-letter error:", err);
    return Response.json(
      { error: "Couldn't generate the cover letter. Please try again." },
      { status: 500 }
    );
  }
}
