import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselButtonProps {
  direction: "next" | "prev";
  emblaApi: {
    scrollNext: () => void;
    scrollPrev: () => void;
  } | null;
}

export function CarouselButton({ direction, emblaApi }: CarouselButtonProps) {
  const Icon = direction === "next" ? ChevronRight : ChevronLeft;

  return (
    <button
      className={`absolute top-1/2 z-10 -translate-y-1/2 bg-black/40 p-2 rounded-full hover:bg-black/60 transition-colors ${
        direction === "next" ? "right-4" : "left-4"
      }`}
      onClick={() => {
        if (emblaApi) {
          if (direction === "next") {
            emblaApi.scrollNext();
          } else {
            emblaApi.scrollPrev();
          }
        }
      }}
    >
      <Icon className="text-white" />
    </button>
  );
}