export interface TMDBSearchResult {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  rating: number;
  genreIds: number[];
  overview: string;
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  rating: number;
  genres: { id: number; name: string }[];
  overview: string;
  runtime: number;
}

export async function searchMovies(query: string): Promise<TMDBSearchResult[]> {
  if (!query.trim()) return [];

  const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data.results || [];
}

export async function getMovieDetails(id: number): Promise<TMDBMovieDetail | null> {
  const res = await fetch(`/api/tmdb/movie?id=${id}`);
  if (!res.ok) return null;

  return res.json();
}

export function getPosterUrl(posterPath: string | null, size: string = "w342"): string {
  if (!posterPath) return "";
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
