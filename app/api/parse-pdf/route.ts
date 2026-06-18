import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return Response.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json(
        { error: "File is too large (max 8 MB)." },
        { status: 400 }
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const clean = text
      .replace(/ /g, " ") // non-breaking spaces -> normal spaces
      .replace(/[ \t]+\n/g, "\n") // trailing whitespace per line
      .replace(/\n{3,}/g, "\n\n") // collapse big gaps
      .trim();

    if (!clean) {
      return Response.json(
        {
          error:
            "Couldn't read any text from this PDF. It may be a scanned image - try pasting the text instead.",
        },
        { status: 422 }
      );
    }

    return Response.json({ text: clean, totalPages });
  } catch (err) {
    console.error("PDF parse error:", err);
    return Response.json(
      { error: "Failed to read the PDF. Try pasting the text instead." },
      { status: 500 }
    );
  }
}
