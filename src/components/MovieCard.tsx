"use client";

import { motion, PanInfo } from "framer-motion";
import { MovieCard as MovieCardType, getGenreColor } from "@/lib/types";
import { useCanvasStore } from "@/store/canvasStore";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: MovieCardType;
  index: number;
}

function getGenreFrameBg(genreColor: string): string {
  return `${genreColor}0A`;
}

export default function MovieCard({ movie, index }: MovieCardProps) {
  const genreColor = getGenreColor(movie.primaryGenre.name);
  const updateMoviePosition = useCanvasStore((s) => s.updateMoviePosition);
  const removeMovie = useCanvasStore((s) => s.removeMovie);
  const acceptSuggestion = useCanvasStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useCanvasStore((s) => s.dismissSuggestion);
  const viewport = useCanvasStore((s) => s.viewport);
  const isDraggingRef = useRef(false);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    isDraggingRef.current = false;
    const dx = info.offset.x / viewport.zoom;
    const dy = info.offset.y / viewport.zoom;
    updateMoviePosition(movie.id, {
      x: movie.position.x + dx,
      y: movie.position.y + dy,
    });
  };

  return (
    <motion.div
      data-movie-card
      className="absolute group"
      style={{
        left: movie.position.x,
        top: movie.position.y,
        width: 200,
        transformOrigin: "center center",
        cursor: "grab",
        zIndex: isDraggingRef.current ? 50 : 1,
      }}
      initial={{
        y: -600,
        opacity: 0,
        rotateX: 15,
        rotateZ: 0,
        scale: 0.9,
      }}
      animate={{
        y: 0,
        opacity: 1,
        rotateX: 0,
        rotateZ: movie.rotation,
        scale: 1,
      }}
      transition={{
        type: "tween",
        ease: [0.22, 0, 0.36, 1],
        duration: 0.45,
        delay: index * 0.15,
      }}
      exit={{
        y: -200,
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.3, ease: "easeIn" },
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragListener={true}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.05,
        cursor: "grabbing",
        zIndex: 50,
      }}
    >
      {/* Genre-colored frame — motion.div for glow animation */}
      <motion.div
        className="relative"
        style={{
          border: `2px solid ${genreColor}40`,
          background: getGenreFrameBg(genreColor),
          boxShadow: `0 2px 16px rgba(0,0,0,0.08)`,
        }}
        initial={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
        animate={{
          boxShadow: `0 4px 24px ${genreColor}20`,
        }}
        transition={{
          delay: index * 0.15 + 0.45,
          duration: 0.3,
        }}
      >
        {/* shadcn Card — structural wrapper */}
        <Card
          className={cn(
            "rounded-none border-0 bg-transparent overflow-hidden p-0 gap-0",
            movie.isSuggestion && !movie.isAccepted ? "shimmer-border" : ""
          )}
        >
          {/* Movie Poster */}
          <div
            className={cn(
              "relative w-full aspect-[2/3]",
              movie.isSuggestion && !movie.isAccepted ? "suggestion-poster" : ""
            )}
            style={{ background: "#F0F0F0" }}
          >
            {movie.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={movie.title}
                className="w-full h-full object-cover"
                draggable={false}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-sm text-center px-4 text-muted-foreground">
                  {movie.title}
                </span>
              </div>
            )}

            {/* AI Suggested badge */}
            {movie.isSuggestion && !movie.isAccepted && (
              <Badge className="absolute top-2 left-2 rounded-none font-mono tracking-wider uppercase bg-primary/90 text-primary-foreground">
                AI Suggested
              </Badge>
            )}

            {/* Remove button — top right, visible on hover */}
            {!(movie.isSuggestion && !movie.isAccepted) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMovie(movie.id);
                }}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/70"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="10" y2="10" />
                  <line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            )}
          </div>

          {/* Info bar */}
          <CardContent className="card-info-glass px-4 py-3">
            {/* Title + Year */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium truncate leading-tight text-foreground font-sans">
                {movie.title}
              </h3>
              <span className="text-xs shrink-0 text-muted-foreground font-mono">
                {movie.year}
              </span>
            </div>

            {/* Rating + Genre */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 font-mono">
                <span className="text-xs" style={{ color: "#D97706" }}>★</span>
                <span className="text-xs font-medium text-foreground">
                  {movie.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">·</span>
              <Badge
                variant="outline"
                className="rounded-none"
                style={{
                  color: genreColor,
                  background: `${genreColor}10`,
                  borderColor: `${genreColor}25`,
                }}
              >
                {movie.primaryGenre.name}
              </Badge>
            </div>

            {/* Accept / Dismiss buttons */}
            {movie.isSuggestion && !movie.isAccepted && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    acceptSuggestion(movie.id);
                  }}
                  className="flex-1 rounded-none bg-primary/10 border-primary/30 text-primary cursor-pointer"
                >
                  Keep
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissSuggestion(movie.id);
                  }}
                  className="flex-1 rounded-none bg-destructive/6 border-destructive/20 text-destructive cursor-pointer"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Shadow that fades in on landing */}
      <motion.div
        className="absolute -bottom-2 left-2 right-2 h-4"
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: index * 0.15 + 0.4,
          duration: 0.2,
        }}
      />
    </motion.div>
  );
}
