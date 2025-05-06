"use client";
import React from "react";
import { AuroraText } from "@/components/magicui/aurora-text";

// Imported icons from FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-regular-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

// importing icons for social media
import { faFacebook, faTwitter, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export  function Footer(){

    return(
    <div>
      <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
        <div className="flex w-full flex-col md:flex-row mr-auto">
          <div className="w-full md:w-1/3 p-4 text-center text-white">
            <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">
              <AuroraText speed={3}>TRAVEL PLACE</AuroraText>
            </h1>
            <p className="text-gray-700">Su operador mayorista en Guatemala</p>
          </div>

          <div className="w-full md:w-1/3 p-4 text-center text-white">
            <div>
            
            </div>
          </div>

          <div className="w-full md:w-1/3 p-4 text-center text-black">
            <div className="flex  md:flex-row md:justify-left justify-center items-center space-x-6">
              <a href="https://facebook.com/travelplacegt" target="_blank" rel="noopener noreferrer" className="text-purple-900 hover:text-purple-950">
                <FontAwesomeIcon icon={faFacebook} size="2x" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-purple-900 hover:text-purple-950">
                <FontAwesomeIcon icon={faTwitter} size="2x" />
              </a>
              <a href="https://instagram.com/@travelplacegt" target="_blank" rel="noopener noreferrer" className="text-purple-900 hover:text-purple-950">
                <FontAwesomeIcon icon={faInstagram} size="2x" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-purple-900 hover:text-purple-950">
              <FontAwesomeIcon icon={faLinkedin} size="2x" />
              </a>
            </div>
            <br/>
            <div className="flex flex-col items-center md:items-right space-y-4">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faEnvelope} className="text-gray-700 mr-3" />
                <span>Correo: <a href="mailto:info@travelplace.com" className="text-purple-950">info@travelplace.com</a></span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faPhone} className="text-gray-700 mr-3" />
                <span>Teléfono: <a href="tel:+50223168151" className="text-purple-950">+502 2316 8151</a></span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-700 mr-3" />
                <span>Dirección: <a href="" className="text-purple-950">Centro Empresarial <br />San Cristobal Ciudad de Mixco</a></span>
              </div>
            </div>
          </div>       
        </div>
        <div className="absolute bottom-0 left-0 w-full -z-10 mb-0 md:-mb-25">
          <img src="/Travel-Place-footer-2.svg" alt="Travel Place Footer" className="w-full" />
        </div>
      </div>
    </div>
  );
}