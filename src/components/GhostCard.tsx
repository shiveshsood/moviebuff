"use client";

import { PendingMovie, getGenreColor } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface GhostCardProps {
  movie: PendingMovie;
  mouseX: number;
  mouseY: number;
}

/** Semi-transparent preview card that follows the cursor during placement mode */
export default function GhostCard({ movie, mouseX, mouseY }: GhostCardProps) {
  const genreColor = getGenreColor(movie.primaryGenre.name);

  return (
    <div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: mouseX - 100,
        top: mouseY - 170,
        width: 200,
        opacity: 0.7,
        transform: "rotate(-2deg)",
      }}
    >
      {/* Genre-colored frame */}
      <div
        className="relative"
        style={{
          border: `2px solid ${genreColor}60`,
          background: `${genreColor}08`,
        }}
      >
        <Card className="rounded-none border-0 bg-transparent overflow-hidden p-0 gap-0">
          {/* Movie Poster */}
          <div className="relative w-full aspect-[2/3] bg-white/50">
            {movie.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={movie.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm text-center px-4">
                  {movie.title}
                </span>
              </div>
            )}
          </div>

          {/* Info bar */}
          <CardContent className="p-3 bg-white/90">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium truncate leading-tight text-foreground font-sans">
                {movie.title}
              </h3>
              <span className="text-xs shrink-0 text-muted-foreground font-mono">
                {movie.year}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
