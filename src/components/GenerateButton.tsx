"use client";

import { useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { getMovieDetails } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [5, 10, 15];

export default function GenerateButton() {
  const movies = useCanvasStore((s) => s.movies);
  const addMovie = useCanvasStore((s) => s.addMovie);
  const isGenerating = useCanvasStore((s) => s.isGenerating);
  const setIsGenerating = useCanvasStore((s) => s.setIsGenerating);
  const suggestionCount = useCanvasStore((s) => s.suggestionCount);
  const setSuggestionCount = useCanvasStore((s) => s.setSuggestionCount);
  const [error, setError] = useState<string | null>(null);

  const userMovies = movies.filter((m) => !m.isSuggestion);

  const handleGenerate = useCallback(async () => {
    console.log("[Generate] clicked, userMovies:", userMovies.length, "isGenerating:", isGenerating);
    if (userMovies.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    console.log("[Generate] starting generation, count:", suggestionCount);

    try {
      const moviePayload = userMovies.map((m) => ({
        title: m.title,
        year: m.year,
        rating: m.rating,
        primaryGenre: m.primaryGenre.name,
      }));

      console.log("[Generate] calling /api/suggest with", moviePayload.length, "movies");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let res: Response;
      try {
        res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movies: moviePayload,
            count: suggestionCount,
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          throw new Error("Request timed out — the AI suggestion API took too long.");
        }
        throw new Error(`Network error: ${fetchErr.message}`);
      }
      clearTimeout(timeoutId);

      console.log("[Generate] API response status:", res.status);

      if (!res.ok) {
        let errMsg = `API error (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        console.error("[Generate] Suggestion error:", errMsg);
        throw new Error(errMsg);
      }

      const data = await res.json();
      const suggestions = data.suggestions;
      console.log("[Generate] received", suggestions?.length, "suggestions");

      if (!suggestions || suggestions.length === 0) {
        console.warn("[Generate] No suggestions returned");
        throw new Error("No suggestions were returned. Try adding more movies first.");
      }

      let addedCount = 0;
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        console.log(`[Generate] processing ${i + 1}/${suggestions.length}: ${suggestion.title}`);

        try {
          let searchData;
          const titleQuery = encodeURIComponent(suggestion.title);

          let searchRes = await fetch(
            `/api/tmdb/search?query=${titleQuery}&year=${suggestion.year}`
          );
          if (searchRes.ok) {
            searchData = await searchRes.json();
          }

          if (!searchData?.results?.length) {
            searchRes = await fetch(`/api/tmdb/search?query=${titleQuery}`);
            if (!searchRes.ok) {
              console.warn(`[Generate] TMDB search failed for "${suggestion.title}"`);
              continue;
            }
            searchData = await searchRes.json();
          }

          if (searchData.results && searchData.results.length > 0) {
            const tmdbResult = searchData.results[0];
            const details = await getMovieDetails(tmdbResult.id);

            if (details && details.genres.length > 0) {
              addMovie({
                tmdbId: details.id,
                title: details.title,
                year: details.year || suggestion.year,
                posterPath: details.posterPath || "",
                rating: details.rating,
                genres: details.genres,
                primaryGenre: details.genres[0],
                isSuggestion: true,
                isAccepted: false,
              });
              addedCount++;
              console.log(`[Generate] added "${details.title}" to canvas`);

              await new Promise((resolve) => setTimeout(resolve, 400));
            }
          }
        } catch (itemErr) {
          console.warn(`[Generate] skipping "${suggestion.title}":`, itemErr);
          continue;
        }
      }

      if (addedCount === 0) {
        throw new Error("Could not find any suggestions on TMDB. Try again.");
      }

      console.log(`[Generate] done, added ${addedCount}/${suggestions.length} suggestions`);
    } catch (error: any) {
      console.error("[Generate] failed:", error);
      setError(error.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
      console.log("[Generate] finished, isGenerating reset to false");
    }
  }, [userMovies, isGenerating, suggestionCount, setIsGenerating, addMovie]);

  if (userMovies.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Error message */}
      {error && (
        <div className="px-3 py-2 text-xs max-w-[280px] rounded-none font-mono bg-destructive/8 border border-destructive/20 text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Count selector — shadcn DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-none font-mono",
                "bg-white/70 border-black/10 text-text-secondary"
              )}
            >
              {suggestionCount}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="rounded-none bg-white/95 backdrop-blur-[20px] border-black/10 min-w-[60px]"
          >
            {COUNT_OPTIONS.map((count) => (
              <DropdownMenuItem
                key={count}
                onClick={() => setSuggestionCount(count)}
                className={cn(
                  "text-xs font-mono rounded-none cursor-pointer",
                  count === suggestionCount
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                {count}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Generate button — shadcn Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || userMovies.length === 0}
          className={cn(
            "px-6 rounded-none font-sans",
            isGenerating
              ? "bg-primary/15 text-muted-foreground cursor-wait"
              : "text-white cursor-pointer"
          )}
          style={
            !isGenerating
              ? { background: "linear-gradient(135deg, #6366F1, #7C3AED)" }
              : undefined
          }
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 border-2 animate-spin"
                style={{
                  borderColor: "rgba(99, 102, 241, 0.3)",
                  borderTopColor: "#6366F1",
                }}
              />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z"
                  fill="currentColor"
                />
              </svg>
              Generate
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
