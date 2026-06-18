export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url?.trim() || !/^https?:\/\//i.test(url.trim())) {
      return Response.json(
        { error: "Please enter a valid job posting URL (starting with http)." },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.fetch.tinyfish.ai", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.TINYFISH_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: [url.trim()],
        format: "markdown",
        per_url_timeout_ms: 45000,
      }),
    });

    const data = await res.json();
    const result = data?.results?.[0];
    const text: string = (result?.text ?? "").toString();

    if (!text.trim()) {
      const reason = data?.errors?.[0]?.error;
      return Response.json(
        {
          error:
            reason === "bot_blocked"
              ? "This site blocks automated reading (common for LinkedIn/Lever). Please copy-paste the job description instead."
              : "Couldn't read that page. Please copy-paste the job description instead.",
        },
        { status: 422 }
      );
    }

    // Trim boilerplate-heavy markdown to a reasonable size for the LLM
    const clean = text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000);

    return Response.json({ text: clean, title: result?.title ?? null });
  } catch (err) {
    console.error("fetch-jd error:", err);
    return Response.json(
      { error: "Couldn't fetch that URL. Please paste the description instead." },
      { status: 500 }
    );
  }
}
