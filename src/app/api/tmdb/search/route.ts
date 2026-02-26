import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const year = request.nextUrl.searchParams.get("year");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    let url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    if (year) {
      url += `&year=${year}`;
    }

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("TMDB search error:", res.status, text);
      return NextResponse.json(
        { error: "TMDB API error", status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Return a trimmed version with only what we need
    const results = data.results.slice(0, 8).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      posterPath: movie.poster_path,
      rating: movie.vote_average,
      genreIds: movie.genre_ids,
      overview: movie.overview,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 500 }
    );
  }
}
