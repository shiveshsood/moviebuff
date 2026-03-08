import { create } from "zustand";
import { MovieCard, Viewport, ClusterLayout, generateCardRotation, SUGGESTIONS_GENRE } from "@/lib/types";

const CARD_SPACING_X = 240;
const CARD_SPACING_Y = 400;
const CARDS_PER_ROW = 3;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 340; // poster 2:3 (300px) + info bar (~40px)

// Suggestions section layout
const SUGGESTION_SPACING_X = 230;
const SUGGESTION_SPACING_Y = 390;
const SUGGESTIONS_PER_ROW = 5;
const SUGGESTION_ORIGIN = { x: 0, y: 0 }; // center of canvas

const STORAGE_KEY = "moviebuff-board";

function saveToStorage(movies: MovieCard[]) {
  try {
    // Only persist user-added / accepted movies (not pending suggestions)
    const toSave = movies.filter((m) => !m.isSuggestion || m.isAccepted);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

function loadFromStorage(): MovieCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MovieCard[];
  } catch {
    return [];
  }
}

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

  // Board actions
  clearBoard: () => void;
  hydrate: () => void;

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

/** Place suggestion cards in a wider grid at the canvas origin */
function calculateSuggestionPosition(indexInSection: number): { x: number; y: number } {
  const row = Math.floor(indexInSection / SUGGESTIONS_PER_ROW);
  const col = indexInSection % SUGGESTIONS_PER_ROW;

  // Center the grid around SUGGESTION_ORIGIN
  const totalCols = Math.min(SUGGESTIONS_PER_ROW, indexInSection + 1);
  const offsetX = -(totalCols - 1) * SUGGESTION_SPACING_X / 2;

  return {
    x: SUGGESTION_ORIGIN.x + offsetX + col * SUGGESTION_SPACING_X,
    y: SUGGESTION_ORIGIN.y + 50 + row * SUGGESTION_SPACING_Y, // +50 for section header
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

  // addMovie — auto-places into genre cluster (or suggestions section), returns position
  addMovie: (movieData) => {
    const state = get();

    // Prevent duplicate
    if (state.movies.some((m) => m.tmdbId === movieData.tmdbId)) return null;

    let position: { x: number; y: number };

    if (movieData.isSuggestion && !movieData.isAccepted) {
      // Place into the suggestions section
      const existingSuggestions = state.movies.filter(
        (m) => m.isSuggestion && !m.isAccepted
      );
      position = calculateSuggestionPosition(existingSuggestions.length);
    } else {
      // Place into genre cluster
      const genreName = movieData.primaryGenre.name;

      // Only count non-suggestion movies in this genre
      const moviesInGenre = state.movies.filter(
        (m) => m.primaryGenre.name === genreName && !(m.isSuggestion && !m.isAccepted)
      );

      // Calculate cluster positions with potentially new genre (exclude suggestions genre)
      const allGenres = [
        ...new Set([
          ...state.movies
            .filter((m) => !(m.isSuggestion && !m.isAccepted))
            .map((m) => m.primaryGenre.name),
          genreName,
        ]),
      ];
      const clusterPositions = calculateClusterPositions(allGenres);
      const clusterCenter = clusterPositions.get(genreName) || { x: 0, y: 0 };

      position = calculateCardPosition(clusterCenter, moviesInGenre.length);
    }

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

    get().recalculateClusters();
    saveToStorage(get().movies);

    return position;
  },

  removeMovie: (id) => {
    set((state) => ({
      movies: state.movies.filter((m) => m.id !== id),
    }));
    get().recalculateClusters();
    saveToStorage(get().movies);
  },

  updateMoviePosition: (id, position) => {
    set((state) => ({
      movies: state.movies.map((m) =>
        m.id === id ? { ...m, position } : m
      ),
    }));
    get().recalculateClusters();
    saveToStorage(get().movies);
  },

  acceptSuggestion: (id) => {
    const state = get();
    const movie = state.movies.find((m) => m.id === id);
    if (!movie) return;

    const genreName = movie.primaryGenre.name;

    // Count existing non-suggestion movies in this genre to find placement index
    const moviesInGenre = state.movies.filter(
      (m) => m.primaryGenre.name === genreName && !(m.isSuggestion && !m.isAccepted) && m.id !== id
    );

    // Calculate where this movie should go in its genre cluster
    const allGenres = [
      ...new Set([
        ...state.movies
          .filter((m) => !(m.isSuggestion && !m.isAccepted))
          .map((m) => m.primaryGenre.name),
        genreName,
      ]),
    ];
    const clusterPositions = calculateClusterPositions(allGenres);
    const clusterCenter = clusterPositions.get(genreName) || { x: 0, y: 0 };
    const newPosition = calculateCardPosition(clusterCenter, moviesInGenre.length);

    set((state) => ({
      movies: state.movies.map((m) =>
        m.id === id
          ? { ...m, isSuggestion: false, isAccepted: true, position: newPosition }
          : m
      ),
    }));

    get().recalculateClusters();
    saveToStorage(get().movies);
  },

  dismissSuggestion: (id) => {
    set((state) => ({
      movies: state.movies.filter((m) => m.id !== id),
    }));
    get().recalculateClusters();
    saveToStorage(get().movies);
  },

  clearBoard: () => {
    set({ movies: [], clusters: new Map() });
    saveToStorage([]);
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (saved.length > 0) {
      set({ movies: saved });
      get().recalculateClusters();

      // Center viewport on the bounding box of all loaded movies
      const allMovies = get().movies;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      allMovies.forEach((m) => {
        minX = Math.min(minX, m.position.x);
        minY = Math.min(minY, m.position.y);
        maxX = Math.max(maxX, m.position.x + CARD_WIDTH);
        maxY = Math.max(maxY, m.position.y + CARD_HEIGHT);
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const screenW = typeof window !== "undefined" ? window.innerWidth : 1280;
      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

      set({
        viewport: {
          x: -centerX + screenW / 2,
          y: -centerY + screenH / 2,
          zoom: 1,
        },
      });
    }
  },

  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setSuggestionCount: (count) => set({ suggestionCount: count }),

  // Compute cluster centroids + bounding boxes from current movie positions
  recalculateClusters: () => {
    const state = get();
    const genreGroups = new Map<string, MovieCard[]>();
    const suggestionMovies: MovieCard[] = [];

    state.movies.forEach((movie) => {
      if (movie.isSuggestion && !movie.isAccepted) {
        // Pending suggestions go into the suggestions section
        suggestionMovies.push(movie);
      } else {
        // User-added + accepted movies go into genre clusters
        const genre = movie.primaryGenre.name;
        if (!genreGroups.has(genre)) {
          genreGroups.set(genre, []);
        }
        genreGroups.get(genre)!.push(movie);
      }
    });

    const newClusters = new Map<string, ClusterLayout>();

    // Genre clusters
    genreGroups.forEach((movies, genre) => {
      const centroidX = movies.reduce((sum, m) => sum + m.position.x, 0) / movies.length;
      const centroidY = movies.reduce((sum, m) => sum + m.position.y, 0) / movies.length;

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

    // Suggestions cluster
    if (suggestionMovies.length > 0) {
      const centroidX = suggestionMovies.reduce((sum, m) => sum + m.position.x, 0) / suggestionMovies.length;
      const centroidY = suggestionMovies.reduce((sum, m) => sum + m.position.y, 0) / suggestionMovies.length;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      suggestionMovies.forEach((m) => {
        minX = Math.min(minX, m.position.x);
        minY = Math.min(minY, m.position.y);
        maxX = Math.max(maxX, m.position.x + CARD_WIDTH);
        maxY = Math.max(maxY, m.position.y + CARD_HEIGHT);
      });

      newClusters.set(SUGGESTIONS_GENRE, {
        genre: SUGGESTIONS_GENRE,
        genreId: -1,
        center: { x: centroidX, y: centroidY },
        movieIds: suggestionMovies.map((m) => m.id),
        boundingBox: { minX, minY, maxX, maxY },
      });
    }

    set({ clusters: newClusters });
  },
}));
