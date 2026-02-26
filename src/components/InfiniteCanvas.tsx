"use client";

import { useCallback, useRef, useEffect } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import MovieCard from "./MovieCard";
import GenreSection from "./GenreSection";
import SearchBar from "./SearchBar";
import GenerateButton from "./GenerateButton";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export default function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const { movies, viewport, clusters, setViewport, isDraggingCanvas, setIsDraggingCanvas } =
    useCanvasStore();

  // Pan: mouse drag on empty space
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-movie-card]")) return;

      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setIsDraggingCanvas(true);
      e.preventDefault();
    },
    [setIsDraggingCanvas]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      setViewport({
        x: viewport.x + dx,
        y: viewport.y + dy,
      });
    },
    [viewport.x, viewport.y, setViewport]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    setIsDraggingCanvas(false);
  }, [setIsDraggingCanvas]);

  // Zoom: scroll wheel centered on cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * zoomFactor));
      const zoomRatio = newZoom / viewport.zoom;

      const newX = cursorX - (cursorX - viewport.x) * zoomRatio;
      const newY = cursorY - (cursorY - viewport.y) * zoomRatio;

      setViewport({
        x: newX,
        y: newY,
        zoom: newZoom,
      });
    },
    [viewport, setViewport]
  );

  // Attach wheel listener with { passive: false } to prevent default
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // Handle mouse up outside the canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isPanning.current = false;
      setIsDraggingCanvas(false);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [setIsDraggingCanvas]);

  return (
    <div className="relative w-full h-full">
      {/* Navbar */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-between h-16 px-8">
          {/* Brand name — top left */}
          <span className="text-lg font-bold tracking-[0.08em] pointer-events-auto select-none text-foreground font-sans">
            moviebuff
          </span>

          {/* Search bar — top center */}
          <div className="pointer-events-auto">
            <SearchBar />
          </div>

          {/* Right side — reserved for future controls */}
          <div className="w-[120px]" />
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full canvas-grid overflow-hidden"
        style={{
          cursor: isDraggingCanvas ? "grabbing" : "grab",
          backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Canvas transform layer */}
        <div
          className="will-change-transform"
          style={{
            transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Genre sections — behind cards */}
          {Array.from(clusters.entries()).map(([genre, cluster]) => (
            <GenreSection key={genre} cluster={cluster} />
          ))}

          {/* Movie cards */}
          {movies.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} index={index} />
          ))}
        </div>

        {/* Empty state */}
        {movies.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-lg tracking-wide text-muted-foreground">
              Search for a movie to begin
            </p>
          </div>
        )}
      </div>

      {/* Generate button — bottom right */}
      <div className="absolute bottom-8 z-50 pointer-events-auto" style={{ right: 40 }}>
        <GenerateButton />
      </div>
    </div>
  );
}
