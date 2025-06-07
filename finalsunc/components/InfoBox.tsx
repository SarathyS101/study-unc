// components/InfoBox.tsx
"use client";

import React, { useState, useEffect } from "react";

const MESSAGES = [
  "Sick of hunting for a free table in Davis during peak class hours?",
  "Got that dream classroom taken all semester—wish you could claim it?",
  "We track UNC rooms live so you can snag prime study spots.",
  "Just pick a building, day, and time to unlock open classrooms that have scheduled classes during the semester."
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
      }, 450); // 500ms fade‐out before changing text
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
        <li>Scrapes UNC class schedules per subject automatically</li>
        <li>Parses schedules and rooms using BeautifulSoup</li>
        <li>Inserts timestamped entries into Supabase database</li>
      </ul>
    </div>
  );
}
