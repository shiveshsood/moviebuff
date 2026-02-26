import { create } from "zustand";
import { MovieCard, Viewport, ClusterLayout, generateCardRotation } from "@/lib/types";

const CARD_SPACING_X = 240;
const CARD_SPACING_Y = 400;
const CARDS_PER_ROW = 3;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 340; // poster 2:3 (300px) + info bar (~40px)

interface CanvasStore {
  // State
  movies: MovieCard[];
  viewport: Viewport;
  clusters: Map<string, ClusterLayout>;
  isDraggingCanvas: boolean;
  isGenerating: boolean;
  suggestionCount: number;

  // Viewport actions
  setViewport: (viewport: Partial<Viewport>) => void;
  setIsDraggingCanvas: (dragging: boolean) => void;

  // Movie actions — addMovie returns the new card's position (or null if duplicate)
  addMovie: (movie: Omit<MovieCard, "position" | "rotation" | "id">) => { x: number; y: number } | null;
  removeMovie: (id: string) => void;
  updateMoviePosition: (id: string, position: { x: number; y: number }) => void;
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;

  // Suggestion actions
  setIsGenerating: (generating: boolean) => void;
  setSuggestionCount: (count: number) => void;

  // Internal
  recalculateClusters: () => void;
}

function calculateClusterPositions(genres: string[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const count = genres.length;

  if (count === 0) return positions;

  // Arrange clusters in a circle with good spacing
  const baseRadius = Math.max(600, count * 250);

  genres.forEach((genre, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    positions.set(genre, {
      x: Math.cos(angle) * baseRadius,
      y: Math.sin(angle) * baseRadius,
    });
  });

  return positions;
}

function calculateCardPosition(
  clusterCenter: { x: number; y: number },
  indexInCluster: number
): { x: number; y: number } {
  const row = Math.floor(indexInCluster / CARDS_PER_ROW);
  const col = indexInCluster % CARDS_PER_ROW;

  // Center the grid within the cluster
  const offsetX = -(Math.min(CARDS_PER_ROW, indexInCluster + 1) - 1) * CARD_SPACING_X / 2;

  return {
    x: clusterCenter.x + offsetX + col * CARD_SPACING_X,
    y: clusterCenter.y + 40 + row * CARD_SPACING_Y, // +40 to leave room for cluster label
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  movies: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  clusters: new Map(),
  isDraggingCanvas: false,
  isGenerating: false,
  suggestionCount: 8,

  setViewport: (partial) =>
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    })),

  setIsDraggingCanvas: (dragging) => set({ isDraggingCanvas: dragging }),

  // addMovie — auto-places into genre cluster, returns position
  addMovie: (movieData) => {
    const state = get();

    // Prevent duplicate
    if (state.movies.some((m) => m.tmdbId === movieData.tmdbId)) return null;

    const genreName = movieData.primaryGenre.name;

    // Collect existing movies in this genre cluster
    const moviesInGenre = state.movies.filter(
      (m) => m.primaryGenre.name === genreName
    );

    // Calculate cluster positions with potentially new genre
    const allGenres = [
      ...new Set([
        ...state.movies.map((m) => m.primaryGenre.name),
        genreName,
      ]),
    ];
    const clusterPositions = calculateClusterPositions(allGenres);
    const clusterCenter = clusterPositions.get(genreName) || { x: 0, y: 0 };

    const position = calculateCardPosition(clusterCenter, moviesInGenre.length);
    const rotation = generateCardRotation();

    const newMovie: MovieCard = {
      ...movieData,
      id: `movie-${movieData.tmdbId}`,
      position,
      rotation,
    };

    set((state) => ({
      movies: [...state.movies, newMovie],
    }));

    // Recalculate cluster labels
    get().recalculateClusters();

    return position;
  },

  removeMovie: (id) => {
    set((state) => ({
      movies: state.movies.filter((m) => m.id !== id),
    }));
    get().recalculateClusters();
  },

  updateMoviePosition: (id, position) => {
    set((state) => ({
      movies: state.movies.map((m) =>
        m.id === id ? { ...m, position } : m
      ),
    }));
    // Recalculate cluster centroids after drag
    get().recalculateClusters();
  },

  acceptSuggestion: (id) => {
    set((state) => ({
      movies: state.movies.map((m) =>
        m.id === id ? { ...m, isSuggestion: false, isAccepted: true } : m
      ),
    }));
  },

  dismissSuggestion: (id) => {
    set((state) => ({
      movies: state.movies.filter((m) => m.id !== id),
    }));
    get().recalculateClusters();
  },

  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setSuggestionCount: (count) => set({ suggestionCount: count }),

  // Compute cluster centroids + bounding boxes from current movie positions
  recalculateClusters: () => {
    const state = get();
    const genreGroups = new Map<string, MovieCard[]>();

    state.movies.forEach((movie) => {
      const genre = movie.primaryGenre.name;
      if (!genreGroups.has(genre)) {
        genreGroups.set(genre, []);
      }
      genreGroups.get(genre)!.push(movie);
    });

    const newClusters = new Map<string, ClusterLayout>();

    genreGroups.forEach((movies, genre) => {
      // Compute centroid from actual movie positions
      const centroidX = movies.reduce((sum, m) => sum + m.position.x, 0) / movies.length;
      const centroidY = movies.reduce((sum, m) => sum + m.position.y, 0) / movies.length;

      // Compute bounding box of all cards in this genre
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      movies.forEach((m) => {
        minX = Math.min(minX, m.position.x);
        minY = Math.min(minY, m.position.y);
        maxX = Math.max(maxX, m.position.x + CARD_WIDTH);
        maxY = Math.max(maxY, m.position.y + CARD_HEIGHT);
      });

      newClusters.set(genre, {
        genre,
        genreId: movies[0].primaryGenre.id,
        center: { x: centroidX, y: centroidY },
        movieIds: movies.map((m) => m.id),
        boundingBox: { minX, minY, maxX, maxY },
      });
    });

    set({ clusters: newClusters });
  },
}));
