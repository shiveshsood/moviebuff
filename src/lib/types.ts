export interface Genre {
  id: number;
  name: string;
}

export interface MovieCard {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  rating: number;
  genres: Genre[];
  primaryGenre: Genre;
  position: { x: number; y: number };
  rotation: number; // random angle in degrees, assigned on creation
  isSuggestion: boolean;
  isAccepted: boolean;
}

export interface ClusterLayout {
  genre: string;
  genreId: number;
  center: { x: number; y: number };
  movieIds: string[];
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Genre color mapping — deeper values for contrast on light pastel background
export const GENRE_COLORS: Record<string, string> = {
  "Science Fiction": "#2563EB",
  "Drama": "#9333EA",
  "Action": "#DC2626",
  "Comedy": "#D97706",
  "Horror": "#059669",
  "Romance": "#DB2777",
  "Thriller": "#475569",
  "Fantasy": "#7C3AED",
  "Adventure": "#7C3AED",
  "Animation": "#0284C7",
  "Documentary": "#78716C",
  "Crime": "#DC2626",
  "Mystery": "#475569",
  "War": "#DC2626",
  "History": "#78716C",
  "Music": "#D97706",
  "Western": "#78716C",
  "Family": "#0284C7",
  "TV Movie": "#475569",
};

// Pastel / icy versions of genre colors — for section backgrounds
export const GENRE_PASTEL_COLORS: Record<string, string> = {
  "Science Fiction": "#DBEAFE",
  "Drama": "#F3E8FF",
  "Action": "#FEE2E2",
  "Comedy": "#FEF3C7",
  "Horror": "#D1FAE5",
  "Romance": "#FCE7F3",
  "Thriller": "#E2E8F0",
  "Fantasy": "#EDE9FE",
  "Adventure": "#EDE9FE",
  "Animation": "#E0F2FE",
  "Documentary": "#F5F5F4",
  "Crime": "#FEE2E2",
  "Mystery": "#E2E8F0",
  "War": "#FEE2E2",
  "History": "#F5F5F4",
  "Music": "#FEF3C7",
  "Western": "#F5F5F4",
  "Family": "#E0F2FE",
  "TV Movie": "#E2E8F0",
};

export const GENRE_GLOW_CLASSES: Record<string, string> = {
  "Science Fiction": "glow-scifi",
  "Drama": "glow-drama",
  "Action": "glow-action",
  "Comedy": "glow-comedy",
  "Horror": "glow-horror",
  "Romance": "glow-romance",
  "Thriller": "glow-thriller",
  "Fantasy": "glow-fantasy",
  "Adventure": "glow-fantasy",
  "Animation": "glow-animation",
  "Documentary": "glow-documentary",
  "Crime": "glow-action",
  "Mystery": "glow-thriller",
  "War": "glow-action",
  "History": "glow-documentary",
  "Music": "glow-comedy",
  "Western": "glow-documentary",
  "Family": "glow-animation",
  "TV Movie": "glow-thriller",
};

export function getGenreColor(genreName: string): string {
  return GENRE_COLORS[genreName] || "#94A3B8";
}

export function getGenrePastelColor(genreName: string): string {
  return GENRE_PASTEL_COLORS[genreName] || "#F1F5F9";
}

export function getGenreGlowClass(genreName: string): string {
  return GENRE_GLOW_CLASSES[genreName] || "glow-thriller";
}

/** Generate a random rotation for a card: -15 to +15 deg, ~20% chance of 0 */
export function generateCardRotation(): number {
  if (Math.random() < 0.2) return 0;
  return (Math.random() - 0.5) * 30;
}
