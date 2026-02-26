import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Movie ID required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=en-US`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("TMDB movie error:", res.status, text);
      return NextResponse.json(
        { error: "TMDB API error", status: res.status },
        { status: res.status }
      );
    }

    const movie = await res.json();

    return NextResponse.json({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      posterPath: movie.poster_path,
      rating: movie.vote_average,
      genres: movie.genres.map((g: any) => ({ id: g.id, name: g.name })),
      overview: movie.overview,
      runtime: movie.runtime,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 500 }
    );
  }
}
