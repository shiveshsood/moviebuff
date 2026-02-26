import { create } from "zustand";
import { MovieCard, PendingMovie, Viewport, ClusterLayout, generateCardRotation } from "@/lib/types";

interface CanvasStore {
  // State
  movies: MovieCard[];
  viewport: Viewport;
  clusters: Map<string, ClusterLayout>;
  isDraggingCanvas: boolean;
  isGenerating: boolean;
  suggestionCount: number;

  // Click-to-place state
  pendingMovie: PendingMovie | null;
  isPlacingMovie: boolean;

  // Viewport actions
  setViewport: (viewport: Partial<Viewport>) => void;
  setIsDraggingCanvas: (dragging: boolean) => void;

  // Movie actions
  addMovie: (movie: Omit<MovieCard, "position" | "rotation" | "id">) => void;
  removeMovie: (id: string) => void;
  updateMoviePosition: (id: string, position: { x: number; y: number }) => void;
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;

  // Click-to-place actions
  setPendingMovie: (movie: PendingMovie | null) => void;
  placeMovie: (canvasPosition: { x: number; y: number }) => void;
  cancelPlacement: () => void;

  // Suggestion actions
  setIsGenerating: (generating: boolean) => void;
  setSuggestionCount: (count: number) => void;

  // Internal
  recalculateClusters: () => void;
}

const CARD_SPACING_X = 240;
const CARD_SPACING_Y = 400;
const CARDS_PER_ROW = 3;

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
  pendingMovie: null,
  isPlacingMovie: false,

  setViewport: (partial) =>
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    })),

  setIsDraggingCanvas: (dragging) => set({ isDraggingCanvas: dragging }),

  // addMovie — used by AI suggestions (auto-places via cluster layout)
  addMovie: (movieData) => {
    const state = get();

    // Prevent duplicate
    if (state.movies.some((m) => m.tmdbId === movieData.tmdbId)) return;

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

    // Recalculate cluster labels (passive — only centroid, no repositioning)
    get().recalculateClusters();
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

  // Click-to-place: set a pending movie (from search)
  setPendingMovie: (movie) => {
    set({ pendingMovie: movie, isPlacingMovie: !!movie });
  },

  // Click-to-place: place the pending movie at the clicked canvas position
  placeMovie: (canvasPosition) => {
    const state = get();
    if (!state.pendingMovie) return;

    // Prevent duplicate
    if (state.movies.some((m) => m.tmdbId === state.pendingMovie!.tmdbId)) {
      set({ pendingMovie: null, isPlacingMovie: false });
      return;
    }

    const rotation = generateCardRotation();

    const newMovie: MovieCard = {
      ...state.pendingMovie,
      id: `movie-${state.pendingMovie.tmdbId}`,
      position: canvasPosition,
      rotation,
    };

    set((state) => ({
      movies: [...state.movies, newMovie],
      pendingMovie: null,
      isPlacingMovie: false,
    }));

    // Recalculate cluster labels
    get().recalculateClusters();
  },

  // Cancel placement
  cancelPlacement: () => {
    set({ pendingMovie: null, isPlacingMovie: false });
  },

  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setSuggestionCount: (count) => set({ suggestionCount: count }),

  // Passive clusters — compute centroids from current movie positions, don't reposition movies
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

      newClusters.set(genre, {
        genre,
        genreId: movies[0].primaryGenre.id,
        center: { x: centroidX, y: centroidY },
        movieIds: movies.map((m) => m.id),
      });
    });

    set({
      clusters: newClusters,
    });
  },
}));
