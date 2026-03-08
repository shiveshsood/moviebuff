"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "moviebuff-welcomed";

const steps = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Search",
    description: "Find movies using the search bar — they\u2019ll auto-place into genre clusters on the canvas.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
    title: "Explore",
    description: "Drag to pan the canvas. Scroll to zoom — or pinch on mobile.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
    title: "Generate",
    description: "Hit the Generate button for AI-powered movie suggestions based on your taste.",
  },
];

export default function WelcomeModal() {
  const [show, setShow] = useState(false);

  // Check localStorage after mount (SSR-safe)
  useEffect(() => {
    const welcomed = localStorage.getItem(STORAGE_KEY);
    if (!welcomed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
            onClick={handleDismiss}
          />

          {/* Modal card — shadcn Card with standard spacing */}
          <motion.div
            className="relative w-[420px] max-w-[calc(100vw-48px)]"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
          >
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg tracking-[0.04em] font-sans">
                  Welcome to moviebuff
                </CardTitle>
                <CardDescription>
                  Your infinite canvas for movie discovery.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    {/* Icon circle */}
                    <div
                      className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                      style={{
                        background: "rgba(99, 102, 241, 0.08)",
                        color: "#6366F1",
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* Text */}
                    <div className="pt-0.5">
                      <span className="text-sm font-semibold text-foreground font-sans">
                        {step.title}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>

              <CardFooter>
                <Button
                  onClick={handleDismiss}
                  size="lg"
                  className="w-full"
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
