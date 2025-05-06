// Removed unused imports
import { Carousel } from "@/components/ui/carousel";
import { TextReveal } from "@/components/magicui/text-reveal";
import { Footer } from "@/components/ui/footer";
import { ImagesSliderDemo } from "@/components/heroSlider";
import BannerConsolidador from "@/components/bannerConsolidador";
import TeamSection from "@/components/teamSection";
import { BlurFadeGrid } from "@/components/imageGridSection";

export default function Home() {
  return (
    <main>
      <ImagesSliderDemo />
      <BannerConsolidador />
      <div className="relative flex h-[900px] w-full flex-col items-center justify-center overflow-hidden border bg-background">
        <h1 className="text-3xl font-bold mb-4 text-center text-gray-900">Paquetes destacados</h1>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-10 px-20">
          <div className="item-center gap-6 col-span-2 py-10 lg:w-[75.0%] mx-auto">
            <Carousel />
          </div>
        </div>
      </div>

      <TextReveal className="mt-0">
        Somos un operador mayorista que dispone de alianzas estratégicas con el propósito de servir como socio de excelencia de los agentes de viajes para alcanzar juntos la satisfacción de nuestros viajeros.
      </TextReveal>

      <BlurFadeGrid></BlurFadeGrid>
      <h1 className="text-3xl font-bold mb-4 text-center text-gray-900">CONOCE A NUESTRO EQUIPO</h1>
      <TeamSection></TeamSection>
      <Footer></Footer>
    </main>
  );
}