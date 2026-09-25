"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-24">
      <section className="relative w-full max-w-lg overflow-hidden py-16">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass rounded-2xl p-10 text-center glass-inner-highlight"
          >
            <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-foreground/40" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              An unexpected error occurred. Please try again — if the problem persists,
              contact support.
            </p>
            <button
              onClick={() => reset()}
              className="btn-glass-primary mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <p className="mt-4 text-xs text-muted/70">
              <Link href="/" className="underline hover:text-foreground transition-colors">
                Back to home
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}