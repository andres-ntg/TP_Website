import React from "react";
import { VideoText } from "./magicui/video-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { HeroParticle } from "./hero";
import { WordRotate } from "@/components/magicui/word-rotate";

export default function HeroSection() { 
return  (
<div className="relative h-[800px] bg-gradient-to-b from-[#ffffff] to-[#ffffff]">
<div className="flex justify-end mt-10 mr-10">
    <ShimmerButton>Iniciar sesión</ShimmerButton>
</div>
    <div className="absolute top-0 w-full h-[600px] z-10 flex items-center justify-center flex-col">
    <div className="relative h-[150px] w-[85%] overflow-hidden">

        <VideoText src="ocean-small.webm" fontSize={13}>TRAVEL PLACE</VideoText>
        
    </div>
    <WordRotate className="text-4xl font-bold  text-center text-violet-900" words={["ALL IN ONE PLACE","HOTELES", "TRASLADOS","ACTIVIDADES","RENTAS DE AUTO"]} />
       
    </div>
    <HeroParticle/>
</div>


)

}