import React from 'react';
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const BannerConsolidador = () => {
    return (
        <div >
                <div className="relative">
                    <div className="white text-white py-6">
                        <h1 className="text-4xl font-bold mb-4 text-center z-50 text-purple-900">GESTOR DE RESERVAS</h1>
                    </div>
                    <svg
                        className="absolute -bottom-20 w-full"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 1440 320"
                    >
                        <path
                            fill="#ffffff"
                            fillOpacity="1"
                            d="M0,50 Q360,0 720,50 T1440,50 V100 H0 Z"
                            // d="M0,0l113,131L225,12l113,104,112-33,113,61,112-87,113,80,112-65v154H0V0Z"

                            
                        ></path>
                    </svg>

                    
                </div>
                  <section className="py-8 px-12 bg-white text-center text-gray-900 grid grid-cols-2">
                    <div className="">
                        <TypingAnimation duration={60} className='mx-20 leading-tight text-lx/8'>
                            Ya te registraste para acceder al contenido más completo para tu agencia de viajes?
                        </TypingAnimation>
                        <div className="flex justify-center mt-5">
                            <a href="https://app.travelplacegt.com" target="_blank" rel="noopener noreferrer">
                                          <ShimmerButton background="#ffffff" className="text-purple-900 font-bold border-purple-500 border" shimmerColor="#3b206e" shimmerSize="0.25rem">
                                            Registrarse
                                          </ShimmerButton>
                                          </a>
                        </div>
                    </div>
                    <div className="">
                      <img src="Travelplace-encabezado-cotizador.jpg" alt="" />
                    </div>
                  </section>
        </div>
    );
};

export default BannerConsolidador;
