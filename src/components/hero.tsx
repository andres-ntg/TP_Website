"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { Particles } from "@/components/magicui/particles";

export function HeroParticle() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Logic related to theme can be added here if needed in the future
  }, [resolvedTheme]);

  return (
    <div className="relative flex h-[50%] w-full flex-col items-center justify-center overflow-hidden">
      {/* <span className="pointer-events-none z-10 whitespace-pre-wrap text-center text-8xl font-semibold leading-none">
        TravelPlace
      </span> */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={"#000000"}
        refresh
      />
    </div>
  );
}