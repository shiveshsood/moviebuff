"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchMovies, getMovieDetails, TMDBSearchResult, getPosterUrl } from "@/lib/tmdb";
import { useCanvasStore } from "@/store/canvasStore";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const setPendingMovie = useCanvasStore((s) => s.setPendingMovie);
  const movies = useCanvasStore((s) => s.movies);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const data = await searchMovies(value);
      setResults(data);
      setIsOpen(data.length > 0);
      setIsLoading(false);
    }, 300);
  }, []);

  // Select a movie → set as pending for click-to-place
  const handleSelectMovie = useCallback(
    async (result: TMDBSearchResult) => {
      if (movies.some((m) => m.tmdbId === result.id)) {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        return;
      }

      const details = await getMovieDetails(result.id);
      if (!details || !details.genres.length) return;

      setPendingMovie({
        tmdbId: details.id,
        title: details.title,
        year: details.year || 0,
        posterPath: details.posterPath || "",
        rating: details.rating,
        genres: details.genres,
        primaryGenre: details.genres[0],
        isSuggestion: false,
        isAccepted: false,
      });

      setQuery("");
      setResults([]);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [setPendingMovie, movies]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectMovie(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-lg">
      {/* Search input — shadcn Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a movie..."
          className={cn(
            "rounded-none pr-10",
            "bg-white/70 backdrop-blur-[20px] border-black/10",
            "text-text-primary font-sans placeholder:text-text-secondary"
          )}
        />
        {/* Search icon or loading spinner */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div
              className="w-4 h-4 border-2 animate-spin"
              style={{
                borderColor: "rgba(0, 0, 0, 0.15)",
                borderTopColor: "#6366F1",
              }}
            />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-text-secondary"
            >
              <path
                d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Autocomplete dropdown — custom (poster thumbnails too specialized for shadcn) */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-full left-0 right-0 mt-1 max-h-[360px] overflow-y-auto z-50",
            "bg-white/95 backdrop-blur-[20px] border border-black/10 rounded-none"
          )}
        >
          {results.map((result, i) => {
            const isAlreadyAdded = movies.some((m) => m.tmdbId === result.id);

            return (
              <button
                key={result.id}
                onClick={() => handleSelectMovie(result)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-none",
                  i === selectedIndex ? "bg-primary/10" : "bg-transparent",
                  isAlreadyAdded ? "opacity-40 cursor-default" : "cursor-pointer"
                )}
                onMouseEnter={() => setSelectedIndex(i)}
                disabled={isAlreadyAdded}
              >
                {/* Poster thumbnail */}
                <div className="w-8 h-12 shrink-0 bg-gray-100 overflow-hidden rounded-none">
                  {result.posterPath ? (
                    <img
                      src={getPosterUrl(result.posterPath, "w92")}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[8px] text-muted-foreground">N/A</span>
                    </div>
                  )}
                </div>

                {/* Movie info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate font-medium text-foreground">
                    {result.title}
                    {isAlreadyAdded && (
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                        (added)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {result.year && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {result.year}
                      </span>
                    )}
                    {result.rating > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-mono" style={{ color: "#D97706" }}>
                          ★ {result.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
