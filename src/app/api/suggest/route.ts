import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Lazy-init the client so env vars are available at request time
// Note: We use CLAUDE_API_KEY instead of ANTHROPIC_API_KEY to avoid
// conflicts with Claude Code's own environment variable overrides.
function getClient() {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    throw new Error("CLAUDE_API_KEY not configured in .env.local");
  }
  return new Anthropic({ apiKey });
}

interface MovieInput {
  title: string;
  year: number;
  rating: number;
  primaryGenre: string;
}

export async function POST(request: NextRequest) {
  try {
    const { movies, count = 8 }: { movies: MovieInput[]; count: number } =
      await request.json();

    if (!movies || movies.length === 0) {
      return NextResponse.json(
        { error: "No movies provided" },
        { status: 400 }
      );
    }

    // Group movies by genre for the prompt
    const genreGroups: Record<string, string[]> = {};
    movies.forEach((m) => {
      if (!genreGroups[m.primaryGenre]) {
        genreGroups[m.primaryGenre] = [];
      }
      genreGroups[m.primaryGenre].push(`${m.title} (${m.year}, ★${m.rating})`);
    });

    const genreSummary = Object.entries(genreGroups)
      .map(([genre, titles]) => `${genre}: ${titles.join(", ")}`)
      .join("\n");

    const existingTitles = movies.map((m) => m.title.toLowerCase());

    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: "You are a cinephile and movie recommendation expert with encyclopedic knowledge of world cinema. Your recommendations are thoughtful, surprising, and tailored — never generic \"top 100\" picks. You notice patterns in collections: thematic threads, directorial preferences, era affinities, and tonal consistency.",
      messages: [
        {
          role: "user",
          content: `Here is my movie collection, grouped by genre:

${genreSummary}

Suggest exactly ${count} movies I'd love. Follow these rules:

1. NEVER suggest any of these movies: ${existingTitles.join(", ")}
2. Read the patterns: if I have multiple 90s thrillers, lean into that era; if my ratings skew high, suggest acclaimed films
3. ~60% should deepen genres I already like (deeper cuts, not obvious picks)
4. ~30% should bridge two or more of my genres (e.g., sci-fi + thriller if I like both)
5. ~10% should be wildcards — critically acclaimed films from genres I haven't explored that match my taste profile
6. Prefer films that are well-known enough to be on TMDB with poster art
7. For each suggestion, write a one-sentence reason that references specific movies in my collection

Return ONLY this JSON (no markdown, no code fences):
[{"title": "Movie Title", "year": 2020, "primaryGenre": "Genre Name", "reason": "Because you loved X, you'll enjoy this for its similar Y"}]`,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let suggestions;
    try {
      // Handle potential markdown code fences
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      suggestions = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("Suggestion API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
