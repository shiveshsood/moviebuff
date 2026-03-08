"use client";

import { motion } from "framer-motion";
import { ClusterLayout } from "@/lib/types";

interface SuggestionsSectionProps {
  cluster: ClusterLayout;
}

const SECTION_PAD_X = 80;
const SECTION_PAD_TOP = 60;
const SECTION_PAD_BOTTOM = 80;

const SUGGESTION_COLOR = "#7C3AED"; // Purple to match Generate button
const SUGGESTION_PASTEL = "#EDE9FE";

/** Purple-themed section for AI suggestions, visually distinct from genre clusters */
export default function SuggestionsSection({ cluster }: SuggestionsSectionProps) {
  const { minX, minY, maxX, maxY } = cluster.boundingBox;

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
        transition: "left 0.3s ease-out, top 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out",
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration: 0.4 },
        scale: { duration: 0.3 },
      }}
    >
      {/* Background fill — purple pastel */}
      <div
        className="absolute inset-0"
        style={{
          background: `${SUGGESTION_PASTEL}59`,
          borderRadius: 12,
        }}
      />

      {/* Dashed border — purple */}
      <div
        className="absolute inset-0"
        style={{
          border: `2px dashed ${SUGGESTION_COLOR}33`,
          borderRadius: 12,
        }}
      />

      {/* Header label — sparkle icon + "Suggestions" */}
      <div
        className="absolute flex items-center gap-2.5"
        style={{ left: 20, top: 16 }}
      >
        {/* Sparkle icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z"
            fill={SUGGESTION_COLOR}
          />
        </svg>

        {/* Section name */}
        <span
          className="text-sm font-semibold tracking-wide font-sans"
          style={{ color: SUGGESTION_COLOR }}
        >
          Suggestions
        </span>

        {/* Count */}
        <span
          className="text-xs font-mono"
          style={{ color: `${SUGGESTION_COLOR}99`, marginLeft: -2 }}
        >
          ({cluster.movieIds.length})
        </span>
      </div>
    </motion.div>
  );
}
