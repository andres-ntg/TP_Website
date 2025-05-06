"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"

import { CarouselButton } from "./carousel-button"
import { CarouselIndicator } from "./carousel-indicator"
import { useTiltEffect } from "./useTiltEffect"


type Slide = {
  src: string
  alt: string
  title: string
  description: string
  author: string
  role: string
}

const slides: Slide[] = [
  {
    src: "TravelitoSaltando.png",
    alt: "Tortuga",
    title: "The Sky-Dweller is a compelling timepiece of contemporary design.",
    description: "",
    author: "John Doe",
    role: "CEO, Company Name",
  },
  {
    src: "TravelitoExplorando.png",
    alt: "León",
    title: "The Sky-Dweller is a compelling timepiece of contemporary design.",
    description: "",
    author: "John Doe",
    role: "CEO, Company Name",
  },
  {
    src: "Tavelito.png",
    alt: "Tigre",
    title: "The Sky-Dweller is a compelling timepiece of contemporary design.",
    description: "",
    author: "John Doe",
    role: "CEO, Company Name",
  },
  {
    src: "https://picsum.photos/400/600?random=3",
    alt: "Tigre",
    title: "The Sky-Dweller is a compelling timepiece of contemporary design.",
    description: "",
    author: "Edwin Muj",
    role: "CEO, Company Name",
  },
]

export function Carousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, containScroll: "trimSnaps",}, [
    Autoplay({ delay: 3000 }),
  ])
  useTiltEffect(emblaApi)
  
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on("select", onSelect)
    onSelect()
  }, [emblaApi])

  return (
    <div className="relative lg:h-[100.0%] mx-auto">
      <div className="overflow-hidden rounded-3xl lg:w-[90%] mx-auto"  ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((slide, index) => (
            <div
              // className="sm:min-w-[100%] md:min-w-[70.0%] h-screen relative px-4"
              //className="relative sm:min-w-[100.0%] md:min-w-[50.0%] px-4 py-6 md:px-8 lg:px-12 backface-hidden"
              className="relative min-w-[100.0%] md:min-w-[50.0%] px-4 py-6 md:px-8 lg:max-h-[20%] backface-hidden"
              key={index}
            >
              <div className="relative aspect-auto overflow-hidden rounded-3xl shadow-md h-full">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/10 backdrop-blur-md text-white rounded-xl border border-white/50 ">
                  <h3 className="text-lg font-semibold">{slide.title}</h3>
                    <p className="text-sm ">{slide.author}</p>
                    <p className="text-xs text-white/70 ">{slide.role}</p>
                </div>
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 p-6 text-white hidden ">
                <h3 className="text-lg font-semibold backdrop-blur-md">{slide.title}</h3>
                  <p className="text-sm backdrop-blur-md">{slide.author}</p>
                  <p className="text-xs text-white/70 backdrop-blur-md">{slide.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      {emblaApi && (
        <>
          <CarouselButton direction="prev" emblaApi={emblaApi} />
          <CarouselButton direction="next" emblaApi={emblaApi} />
        </>
      )}

      {/* Indicadores */}
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, index) => (
          <CarouselIndicator
            key={index}
            isActive={index === selectedIndex}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  )
}