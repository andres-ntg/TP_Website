"use client";
import { motion } from "framer-motion";
import React from "react";
import { ImagesSlider } from "@/components/ui/images-slider";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";

export function ImagesSliderDemo() {
  const images = [
    "https://images.unsplash.com/photo-1745598314075-00a187edfcd1?q=80&w=1674&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1738069138588-6e6d67a5c697?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1740482881694-d72f4e4cc47e?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1661963952208-2db3512ef3de?q=80&w=1844&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ];
  return (
    <ImagesSlider className="h-[40rem]" images={images}>
      <motion.div
        initial={{
          opacity: 0,
          y: -80,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="z-50 flex flex-col justify-center items-center"
      >
        <motion.p className="font-bold text-4xl md:text-9xl text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 py-4">
          TRAVEL PLACE <br /> 
        </motion.p>

          <VelocityScroll defaultVelocity={1} numRows={1} className="z-50 text-white text-base md:text-3xl">Hoteles • Autos • Seguros • Paquetes • Trenes • Tours • Traslados • Bodas •</VelocityScroll>

        <div className="mt-4">
            
              <a href="https://app.travelplacegt.com" target="_blank" rel="noopener noreferrer">
              <ShimmerButton background="#ffffff" className="text-purple-900 font-bold border-purple-500 border" shimmerColor="#3b206e" shimmerSize="0.25rem">
              Iniciar sesión
              </ShimmerButton>
              </a>

        </div>
      </motion.div>
    </ImagesSlider>
  );
}
