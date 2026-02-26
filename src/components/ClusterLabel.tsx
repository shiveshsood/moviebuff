"use client";

import { motion } from "framer-motion";
import { ClusterLayout, getGenreColor } from "@/lib/types";

interface ClusterLabelProps {
  cluster: ClusterLayout;
}

export default function ClusterLabel({ cluster }: ClusterLabelProps) {
  const genreColor = getGenreColor(cluster.genre);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: cluster.center.x - 150,
        top: cluster.center.y - 70,
        width: 300,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Genre name — dark text for light background */}
      <span
        className="text-3xl font-bold tracking-[0.2em] uppercase block text-center"
        style={{
          color: "#1A1A2E",
          textShadow: `0 0 40px ${genreColor}30`, // subtle genre-colored glow
          letterSpacing: "0.2em",
          opacity: 0.7,
        }}
      >
        {cluster.genre.toUpperCase()}
      </span>
      {/* Gradient underline */}
      <div
        className="mt-2 mx-auto h-[3px] w-24"
        style={{
          background: `linear-gradient(90deg, transparent, ${genreColor}, transparent)`,
          opacity: 0.5,
        }}
      />
      {/* Subtle movie count */}
      <span
        className="block text-center mt-1.5 text-xs tracking-widest uppercase"
        style={{
          color: genreColor,
          fontFamily: "var(--font-mono)",
          opacity: 0.6,
        }}
      >
        {cluster.movieIds.length} {cluster.movieIds.length === 1 ? "film" : "films"}
      </span>
    </motion.div>
  );
}
