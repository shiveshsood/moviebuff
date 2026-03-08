"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import MovieCard from "./MovieCard";
import GenreSection from "./GenreSection";
import SearchBar from "./SearchBar";
import GenerateButton from "./GenerateButton";
import WelcomeModal from "./WelcomeModal";
import { Button } from "@/components/ui/button";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export default function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Touch refs
  const isTouchPanning = useRef(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const pinchMidpoint = useRef({ x: 0, y: 0 });

  const { movies, viewport, clusters, setViewport, isDraggingCanvas, setIsDraggingCanvas } =
    useCanvasStore();
  const clearBoard = useCanvasStore((s) => s.clearBoard);
  const hydrate = useCanvasStore((s) => s.hydrate);

  // Hydrate from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ─── Mouse: Pan ───────────────────────────────────────────────

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

  // ─── Mouse: Zoom (scroll wheel) ──────────────────────────────

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

  // ─── Touch: Pan (1 finger) + Pinch Zoom (2 fingers) ──────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use a mutable ref object to access latest viewport without re-attaching
    const getViewport = () => useCanvasStore.getState().viewport;
    const doSetViewport = useCanvasStore.getState().setViewport;

    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchMidpoint = (t1: Touch, t2: Touch, rect: DOMRect) => ({
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    });

    const handleTouchStart = (e: TouchEvent) => {
      // Don't intercept touches on movie cards (let Framer Motion handle drag)
      if ((e.target as HTMLElement).closest("[data-movie-card]")) return;

      if (e.touches.length === 1) {
        // Single finger → pan
        isTouchPanning.current = true;
        lastTouch.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // Two fingers → pinch zoom
        isTouchPanning.current = false;
        const v = getViewport();
        const rect = container.getBoundingClientRect();

        pinchStartDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartZoom.current = v.zoom;
        pinchMidpoint.current = getTouchMidpoint(e.touches[0], e.touches[1], rect);
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-movie-card]")) return;

      const v = getViewport();

      if (e.touches.length === 1 && isTouchPanning.current) {
        // Single finger pan
        const dx = e.touches[0].clientX - lastTouch.current.x;
        const dy = e.touches[0].clientY - lastTouch.current.y;
        lastTouch.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };

        doSetViewport({
          x: v.x + dx,
          y: v.y + dy,
        });
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const rect = container.getBoundingClientRect();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const currentMidpoint = getTouchMidpoint(e.touches[0], e.touches[1], rect);

        if (pinchStartDistance.current === 0) return;

        const scale = currentDistance / pinchStartDistance.current;
        const newZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, pinchStartZoom.current * scale)
        );
        const zoomRatio = newZoom / v.zoom;

        // Zoom centered on the midpoint between the two fingers
        const newX = currentMidpoint.x - (currentMidpoint.x - v.x) * zoomRatio;
        const newY = currentMidpoint.y - (currentMidpoint.y - v.y) * zoomRatio;

        doSetViewport({
          x: newX,
          y: newY,
          zoom: newZoom,
        });
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // All fingers lifted
        isTouchPanning.current = false;
        pinchStartDistance.current = 0;
      } else if (e.touches.length === 1) {
        // Dropped from 2 fingers to 1 → switch to single-finger pan
        isTouchPanning.current = true;
        lastTouch.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        pinchStartDistance.current = 0;
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []); // Empty deps — uses store.getState() directly to avoid re-attaching

  // ─── Wheel listener (passive: false) ──────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // ─── Global mouse up (in case mouse leaves canvas) ────────────

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
      {/* Welcome modal — first visit only */}
      <WelcomeModal />

      {/* Navbar */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        {/* Desktop: single row. Mobile: stacked */}
        <div className="hidden sm:flex items-center justify-between h-16 px-8">
          <span className="text-lg font-bold tracking-[0.08em] pointer-events-auto select-none text-foreground font-sans">
            moviebuff
          </span>
          <div className="pointer-events-auto">
            <SearchBar />
          </div>
          <div className="w-[120px] flex justify-end pointer-events-auto">
            {movies.length > 0 && (
              <ClearBoardButton onClear={clearBoard} />
            )}
          </div>
        </div>

        {/* Mobile navbar */}
        <div className="flex sm:hidden flex-col items-center gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-base font-bold tracking-[0.08em] pointer-events-auto select-none text-foreground font-sans">
              moviebuff
            </span>
            {movies.length > 0 && (
              <div className="pointer-events-auto">
                <ClearBoardButton onClear={clearBoard} />
              </div>
            )}
          </div>
          <div className="pointer-events-auto w-full max-w-[320px]">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full canvas-grid overflow-hidden touch-none"
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

      {/* Generate button — bottom right (pulled in on mobile) */}
      <div className="absolute bottom-8 z-50 pointer-events-auto right-4 sm:right-10">
        <GenerateButton />
      </div>
    </div>
  );
}

/** Small confirm-then-clear button */
function ClearBoardButton({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (confirming) {
          onClear();
          setConfirming(false);
        } else {
          setConfirming(true);
        }
      }}
      className={confirming ? "text-destructive hover:text-destructive" : "text-muted-foreground"}
    >
      {confirming ? "Confirm clear?" : "Clear board"}
    </Button>
  );
}
