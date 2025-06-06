// components/InfoBox.tsx
"use client";

import React, { useState, useEffect } from "react";

const MESSAGES = [
  "🔍 Discover how we automatically analyze user feedback with AI.",
  "⚙️ Built end-to-end on Next.js, TypeScript, and Supabase.",
  "🧠 Uses GPT-4 to generate personalized recommendations in real time.",
  "📊 Visual analytics dashboard powered by Chart.js.",
  "🚀 Designed for scale: serverless functions + edge caching.",
];

export default function InfoBox() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(true);

  useEffect(() => {
    // Every 4 seconds, fade out, advance to next message, then fade back in
    const switchInterval = setInterval(() => {
      setFading(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % MESSAGES.length);
        setFading(true);
      }, 500); // 500ms fade‐out before changing text
    }, 4000);

    return () => clearInterval(switchInterval);
  }, []);

  return (
    <div
      className="
        flex
        min-h-[400px]      /* ← ensure it’s at least 400px tall */
        w-full
        flex-col
        items-start
        justify-center
        overflow-hidden
        px-6
      "
    >
      <h2 className="mb-4 text-2xl font-semibold text-white">
       What is Study@UNC?
      </h2>
      <p
        className={`
          min-h-[4rem]
          w-full
          text-base
          leading-snug
          text-white
          transition-opacity
          duration-500
          ${fading ? "opacity-100" : "opacity-0"}
        `}
      >
        {MESSAGES[currentIndex]}
      </p>
      <ul className="mt-6 flex flex-col gap-2 text-sm text-white/80">
        <li>✔️ Realtime NLP summarization</li>
        <li>✔️ Authentication via Supabase</li>
        <li>✔️ Dark/light theme out of the box</li>
        <li>✔️ TailwindCSS + shadcn/ui components</li>
      </ul>
    </div>
  );
}
