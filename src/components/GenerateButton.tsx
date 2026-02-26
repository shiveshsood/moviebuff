"use client";

import { useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { getMovieDetails } from "@/lib/tmdb";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverButton,
  usePopover,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [5, 10, 15];

/** Inner component that uses the popover context */
function GeneratePopoverContent({
  onGenerate,
  disabled,
}: {
  onGenerate: (count: number) => void;
  disabled: boolean;
}) {
  const { closePopover } = usePopover();
  const suggestionCount = useCanvasStore((s) => s.suggestionCount);
  const setSuggestionCount = useCanvasStore((s) => s.setSuggestionCount);

  return (
    <PopoverContent
      className={cn(
        "bottom-full mb-3 right-0 left-auto",
        "w-[200px] border-black/8",
        "bg-white/98 backdrop-blur-xl shadow-xl"
      )}
    >
      <PopoverBody className="p-2">
        {/* Header */}
        <div className="px-3.5 pt-2.5 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/70">
            Suggestions
          </span>
        </div>

        {/* Divider */}
        <div className="mx-3.5 mb-1.5 border-t border-black/5" />

        {/* Options */}
        {COUNT_OPTIONS.map((count) => {
          const isSelected = count === suggestionCount;
          return (
            <PopoverButton
              key={count}
              onClick={() => {
                setSuggestionCount(count);
                closePopover();
                if (!disabled) {
                  onGenerate(count);
                }
              }}
              className={cn(
                "cursor-pointer text-sm font-sans px-3.5 py-2.5 transition-all",
                isSelected
                  ? "text-primary font-medium bg-primary/8"
                  : "text-foreground/80 hover:bg-black/[0.03] hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-5 h-5 flex items-center justify-center text-[11px] font-mono font-medium border",
                      isSelected
                        ? "border-primary/30 text-primary bg-primary/10"
                        : "border-black/10 text-muted-foreground bg-black/[0.02]"
                    )}
                  >
                    {count}
                  </span>
                  <span>suggestions</span>
                </span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="text-primary"
                  >
                    <path
                      d="M3 7L6 10L11 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="square"
                    />
                  </svg>
                )}
              </span>
            </PopoverButton>
          );
        })}
      </PopoverBody>
    </PopoverContent>
  );
}

export default function GenerateButton() {
  const movies = useCanvasStore((s) => s.movies);
  const addMovie = useCanvasStore((s) => s.addMovie);
  const isGenerating = useCanvasStore((s) => s.isGenerating);
  const setIsGenerating = useCanvasStore((s) => s.setIsGenerating);
  const suggestionCount = useCanvasStore((s) => s.suggestionCount);
  const [error, setError] = useState<string | null>(null);

  const userMovies = movies.filter((m) => !m.isSuggestion);
  const hasMovies = userMovies.length > 0;
  const isDisabled = !hasMovies || isGenerating;

  const handleGenerate = useCallback(
    async (count?: number) => {
      const generateCount = count ?? suggestionCount;
      console.log(
        "[Generate] clicked, userMovies:",
        userMovies.length,
        "isGenerating:",
        isGenerating
      );
      if (userMovies.length === 0 || isGenerating) return;

      setIsGenerating(true);
      setError(null);
      console.log("[Generate] starting generation, count:", generateCount);

      try {
        const moviePayload = userMovies.map((m) => ({
          title: m.title,
          year: m.year,
          rating: m.rating,
          primaryGenre: m.primaryGenre.name,
        }));

        console.log(
          "[Generate] calling /api/suggest with",
          moviePayload.length,
          "movies"
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let res: Response;
        try {
          res = await fetch("/api/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movies: moviePayload,
              count: generateCount,
            }),
            signal: controller.signal,
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === "AbortError") {
            throw new Error(
              "Request timed out — the AI suggestion API took too long."
            );
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
          throw new Error(
            "No suggestions were returned. Try adding more movies first."
          );
        }

        let addedCount = 0;
        for (let i = 0; i < suggestions.length; i++) {
          const suggestion = suggestions[i];
          console.log(
            `[Generate] processing ${i + 1}/${suggestions.length}: ${suggestion.title}`
          );

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
              searchRes = await fetch(
                `/api/tmdb/search?query=${titleQuery}`
              );
              if (!searchRes.ok) {
                console.warn(
                  `[Generate] TMDB search failed for "${suggestion.title}"`
                );
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
                console.log(
                  `[Generate] added "${details.title}" to canvas`
                );

                await new Promise((resolve) => setTimeout(resolve, 400));
              }
            }
          } catch (itemErr) {
            console.warn(
              `[Generate] skipping "${suggestion.title}":`,
              itemErr
            );
            continue;
          }
        }

        if (addedCount === 0) {
          throw new Error(
            "Could not find any suggestions on TMDB. Try again."
          );
        }

        console.log(
          `[Generate] done, added ${addedCount}/${suggestions.length} suggestions`
        );
      } catch (error: any) {
        console.error("[Generate] failed:", error);
        setError(error.message || "Generation failed. Please try again.");
      } finally {
        setIsGenerating(false);
        console.log("[Generate] finished, isGenerating reset to false");
      }
    },
    [userMovies, isGenerating, suggestionCount, setIsGenerating, addMovie]
  );

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Error message */}
      {error && (
        <div className="px-4 py-2.5 text-xs max-w-[280px] font-mono bg-destructive/8 border border-destructive/20 text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Generate button with popover */}
      <PopoverRoot className="justify-end">
        <PopoverTrigger
          disabled={isDisabled}
          className={cn(
            "font-sans px-5 border-0 shadow-md transition-shadow",
            isGenerating
              ? "bg-primary/15 text-muted-foreground cursor-wait shadow-none"
              : !hasMovies
                ? "bg-muted text-muted-foreground/50 cursor-default shadow-none"
                : "text-white cursor-pointer hover:shadow-lg hover:shadow-primary/25"
          )}
          style={
            hasMovies && !isGenerating
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
        </PopoverTrigger>

        <GeneratePopoverContent
          onGenerate={handleGenerate}
          disabled={isDisabled}
        />
      </PopoverRoot>

      {/* Hint when no movies */}
      {!hasMovies && (
        <span className="text-[11px] text-muted-foreground/60 font-mono">
          Add movies to generate suggestions
        </span>
      )}
    </div>
  );
}
