"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDES = Array.from({ length: 8 }, (_, i) => `/slideshow/slide${i + 1}.webp`);

/* Cross-fading background slideshow of in-game Infinite Flight shots — 8s each. */
export function HeroSlideshow() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {SLIDES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          priority={i === 0}
          className="object-cover transition-opacity duration-[1600ms] ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
      {/* Brand tint + readability overlay — lighter so the imagery shows through,
          with a deeper wash only behind the headline (left) for legibility. */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, rgba(8,4,30,0.80) 0%, rgba(12,2,67,0.50) 42%, rgba(26,17,71,0.18) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(8,4,30,0.42) 0%, transparent 38%)" }} />
    </div>
  );
}
