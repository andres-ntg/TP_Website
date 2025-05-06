import { useEffect } from "react"
import { EmblaCarouselType } from "embla-carousel"

export const useTiltEffect = (emblaApi: EmblaCarouselType | undefined) => {
  useEffect(() => {
    if (!emblaApi) return

    const engine = emblaApi.internalEngine()
    const slides = emblaApi.slideNodes()
    const scrollSnaps = engine.scrollSnapList

    const rotate = () => {
        const progress = emblaApi.scrollProgress()
      
        slides.forEach((slide, index) => {
          const diffToTarget = scrollSnaps[index] - progress
      
          // ⚠️ Solo aplicamos efecto si está cerca (±1 slide)
          if (Math.abs(diffToTarget) < 1.5) {
            const clamped = Math.max(-1, Math.min(1, diffToTarget))
            const rotateY = clamped * 60

            slide.style.transform = `perspective(1000px) rotateY(${rotateY}deg)`
            slide.style.transition = "transform 0.3s ease"
          } else {
            // ⚠️ Reseteamos para evitar acumulación
            slide.style.transform = ""
          }
        })
      }

    emblaApi.on("scroll", rotate)
    emblaApi.on("reInit", rotate)

    return () => {
      emblaApi.off("scroll", rotate)
      emblaApi.off("reInit", rotate)
    }
  }, [emblaApi])
}