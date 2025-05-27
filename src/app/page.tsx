// Removed unused imports
import { Carousel } from "@/components/ui/carousel";
import { TextReveal } from "@/components/magicui/text-reveal";
import { Footer } from "@/components/ui/footer";
import { ImagesSliderDemo } from "@/components/heroSlider";
import BannerConsolidador from "@/components/bannerConsolidador";
import TeamSection from "@/components/teamSection";
import { BlurFadeGrid } from "@/components/imageGridSection";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
export default function Home() {
  return (
    <main>

    <div className="absolute top-10 right-10 bg-transparent flex center z-50 padding-2 ">
      <a href="https://wa.me/50223168151" target="_blank" rel="noopener noreferrer">
          <ShimmerButton background="#ffffff" className="text-lime-500 mr-10" shimmerColor="#95D00">WhatsApp</ShimmerButton>
      </a>
      <a href="tel:+50223168151" target="_blank" rel="noopener noreferrer">
        <ShimmerButton background="#ffffff" className="text-purple-900" shimmerColor="#3b206e">PBX: 2316 8151</ShimmerButton>
      </a>
      
    </div>


      <ImagesSliderDemo />
      <BannerConsolidador />
      <div className="relative flex h-[33.0%] w-full flex-col items-center justify-center overflow-hidden border bg-background">
        <h1 className="text-4xl font-bold text-center text-purple-900 ">PAQUETES DESTACADOS</h1>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-10 px-20">
          <div className="item-center gap-6 col-span-2 py-10 lg:w-[75.0%] mx-auto">
            <Carousel />
          </div>
        </div>
      </div>

      <TextReveal className="mt-0 text-justify">
Tu socio estratégico en turismo!
En Travel Place, somos un operador mayorista con alianzas estratégicas diseñadas para ser el mejor aliado de los agentes de viajes, trabajando juntos para garantizar la satisfacción de cada viajero.
Nuestro equipo de expertos en turismo se especializa en ofrecer productos que aportan valor, facilitan la labor de los agentes y cumplen con las más altas expectativas de los viajeros.

      </TextReveal>

      <BlurFadeGrid></BlurFadeGrid>
      <h1 className="text-4xl font-bold mb-4 text-center text-purple-900">CONOCE A NUESTRO EQUIPO</h1>
      <TeamSection></TeamSection>
      <Footer></Footer>
    </main>
  );
}