import { useEffect } from "react"
import { EmblaCarouselType } from "embla-carousel"

export const useTiltEffect = (emblaApi: EmblaCarouselType | undefined) => {
  useEffect(() => {
    if (!emblaApi) return

    const engine = emblaApi.internalEngine()
    const slides = emblaApi.slideNodes()
    const scrollSnaps = engine.scrollSnapList

    const rotate2 = () => {
      const progress = emblaApi.scrollProgress()

      slides.forEach((slide, index) => {
        const diffToTarget = scrollSnaps[index] - progress
        const clamped = Math.max(-1, Math.min(1, diffToTarget)) // limita entre -1 y 1
        const rotateY = clamped * 55 // maxRotateX: 60
        
        const isActive = Math.abs(clamped) < 0.1
        // 💫 Agregamos elevación si está activo 
        const translateY = isActive ? "-250px" : "0px"

        slide.style.transform = `perspective(1000px) rotateY(${rotateY}deg)`
        slide.style.transition = "transform 0.4s ease"
      })
    }
    const rotate = () => {
        const progress = emblaApi.scrollProgress()
      
        slides.forEach((slide, index) => {
          const diffToTarget = scrollSnaps[index] - progress
      
          // ⚠️ Solo aplicamos efecto si está cerca (±1 slide)
          if (Math.abs(diffToTarget) < 1.5) {
            const clamped = Math.max(-1, Math.min(1, diffToTarget))
            const rotateY = clamped * 60

            const isActive = Math.abs(clamped) < 0.05;
            const translateY = isActive ? "-15px" : "0px";
            const boxShadow = isActive ? "0 12px 24px rgba(0,0,0,0.2)" : "none";

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