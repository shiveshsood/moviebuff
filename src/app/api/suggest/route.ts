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
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a movie recommendation expert. Based on the user's movie collection grouped by genre, suggest exactly ${count} movies they would enjoy that are NOT already in their collection.

Their collection:
${genreSummary}

Rules:
- Do NOT suggest any of these movies: ${existingTitles.join(", ")}
- Suggest movies that match the taste patterns you see (era preferences, rating level, genre leanings)
- Mix in some cross-genre suggestions that bridge their interests
- Include a brief reason for each suggestion
- Return ONLY valid JSON, no markdown, no code fences

Return this exact JSON format:
[{"title": "Movie Title", "year": 2020, "primaryGenre": "Genre Name", "reason": "Brief reason"}]`,
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
