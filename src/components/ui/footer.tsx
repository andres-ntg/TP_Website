"use client";
import React from "react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Particles } from "@/components/magicui/particles";


export  function Footer(){


    const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(resolvedTheme === "light" ? "#ffffff" : "#3b206e");
  }, [resolvedTheme]);

    return(
        <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden bg-[#3b206e] ">
        <h1 className="">FOOTER</h1>
        <Particles
          className="absolute inset-0 z-0"
          quantity={100}
          ease={80}
          color={"#693f69"}
          refresh
        />
      </div>
    )
}