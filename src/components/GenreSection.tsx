"use client";

import { motion } from "framer-motion";
import { ClusterLayout, getGenreColor, getGenrePastelColor } from "@/lib/types";

interface GenreSectionProps {
  cluster: ClusterLayout;
}

const SECTION_PAD_X = 80;
const SECTION_PAD_TOP = 60; // room for header
const SECTION_PAD_BOTTOM = 80;

/** FigJam-style rectangular section containing all cards in a genre cluster */
export default function GenreSection({ cluster }: GenreSectionProps) {
  const genreColor = getGenreColor(cluster.genre);
  const pastelColor = getGenrePastelColor(cluster.genre);

  const { minX, minY, maxX, maxY } = cluster.boundingBox;

  // Section rect with padding around the card bounding box
  const sectionX = minX - SECTION_PAD_X;
  const sectionY = minY - SECTION_PAD_TOP;
  const sectionW = maxX - minX + SECTION_PAD_X * 2;
  const sectionH = maxY - minY + SECTION_PAD_TOP + SECTION_PAD_BOTTOM;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: sectionX,
        top: sectionY,
        width: sectionW,
        height: sectionH,
        zIndex: 0,
        // Smooth resize when cards are added/dragged — won't fire on zoom
        // since these values are in canvas coordinates, not screen pixels
        transition: "left 0.3s ease-out, top 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out",
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration: 0.4 },
        scale: { duration: 0.3 },
      }}
    >
      {/* Background fill */}
      <div
        className="absolute inset-0"
        style={{
          background: `${pastelColor}59`, // ~35% opacity
          borderRadius: 12,
        }}
      />

      {/* Dashed border */}
      <div
        className="absolute inset-0"
        style={{
          border: `2px dashed ${genreColor}33`, // ~20% opacity
          borderRadius: 12,
        }}
      />

      {/* Header label — top-left */}
      <div
        className="absolute flex items-center gap-2.5"
        style={{
          left: 20,
          top: 16,
        }}
      >
        {/* Genre color dot */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: genreColor,
            flexShrink: 0,
          }}
        />

        {/* Genre name */}
        <span
          className="text-sm font-semibold tracking-wide font-sans"
          style={{ color: genreColor }}
        >
          {cluster.genre}
        </span>

        {/* Movie count */}
        <span
          className="text-xs font-mono"
          style={{ color: `${genreColor}99`, marginLeft: -2 }}
        >
          ({cluster.movieIds.length} {cluster.movieIds.length === 1 ? "film" : "films"})
        </span>
      </div>
    </motion.div>
  );
}
