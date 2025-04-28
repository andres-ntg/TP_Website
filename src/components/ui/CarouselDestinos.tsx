"use client"

import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import Image from "next/image"
import { useEffect } from "react"

const imageslocal = [
  { src: "/paris.jpg", alt: "París" },
  { src: "/rome.jpg", alt: "Roma" },
  { src: "/newyork.jpg", alt: "Nueva York" },
]

const images = [
    { src: "https://picsum.photos/id/1015/800/400", alt: "Destino 1" },
    { src: "https://picsum.photos/id/1016/800/400", alt: "Destino 2" },
    { src: "https://picsum.photos/id/1018/800/400", alt: "Destino 3" },
  ]

export default function CarouselDestinos() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 3000 }),
  ]) 

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit()
    }
  }, [emblaApi])

  return (
    <div className="overflow-hidden rounded-2xl mt-8 shadow-lg" ref={emblaRef}>
      <div className="flex">
        {images.map((img, index) => (
          <div className="min-w-full relative h-64" key={index}>
            <Image
              src={img.src}
              alt={img.alt}
              layout="fill"
              objectFit="cover"
              className="rounded-2xl"
            />
          </div>
        ))}
      </div>
    </div>
  )
}