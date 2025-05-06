"use client";
import React from 'react';
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Lens } from "@/components/magicui/lens";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BannerConsolidador = () => {
    return (
        <div >
            <div className="relative">
                    <div className="white text-white py-6">
                        <h1 className="text-4xl font-bold mb-4 text-center z-50 text-purple-900">TECNOLOGÍA DE VIAJES</h1>
                    </div>
                </div>
                <div  className="flex justify-center space-x-4">
                            <Card className="relative sm:w-full  lg:w-[70%] shadow-none mb-15 ">
                        
                        <CardHeader>
                            <Lens defaultPosition={{ x: 200, y: 200 }}>
                            <img
                                src="Travelplace-encabezado-cotizador.jpg"
                                alt="image placeholder"
                                className="w-full h-full object-cover"
                            />
                            </Lens>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-2xl">
                            <TypingAnimation duration={60} className="mx-5 leading-tight text-lx/8 text-center  lg:text-3xl text-lg">
                                   ¿Ya te registraste para acceder al contenido más completo para tu agencia de viajes?
                                </TypingAnimation>
                            </CardTitle>
                            <CardDescription className='text-center'>
                                <br />
                            Accede a la plataforma de cotización y reserva de viajes más completa del mercado.
                            </CardDescription>
                        </CardContent>
                        <CardFooter className="flex justify-center space-x-4">
                        <a href="https://app.travelplacegt.com" target="_blank" rel="noopener noreferrer">
                                          <ShimmerButton background="#ffffff" className="text-purple-900 font-bold border-purple-500 border" shimmerColor="#3b206e" shimmerSize="0.25rem">
                                            Registrarse
                                          </ShimmerButton>
                                          </a>
                        </CardFooter>
                        </Card>

                </div>
        </div>
    );
};

export default BannerConsolidador;
