"use client";
import { Video } from "lucide-react";
import React from "react";
import { VideoText } from "../magicui/video-text";
import { AuroraText } from "@/components/magicui/aurora-text";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-regular-svg-icons';





export  function Footer(){

    return(
        <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
        <div className="flex w-full flex-col md:flex-row mx-10 mr-auto">
          <div className="w-full md:w-1/3 p-4 text-center text-white">
          <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">
            <AuroraText>TRAVEL PLACE</AuroraText>
          </h1>
            
          </div>
          <div className="w-full md:w-1/3 p-4 text-center text-black">Column 2</div>
          <div className="w-full md:w-1/3 p-4 text-center text-white">
            <div>
            <FontAwesomeIcon icon={faUser}  color="#000000"/>
                <h2 className="font-bold mb-2">Contact Us</h2>
                <p>
                <Video className="inline-block mr-2" />
                Email: <a href="mailto:info@travelplace.com" className="text-gray-900">info@travelplace.com</a>
                </p>
                <p>
                <FontAwesomeIcon icon={faUser} />
                <Video className="inline-block mr-2" />
                Phone: <a href="tel:+1234567890" className="text-blue-300">+1 (234) 567-890</a>
                </p>
                <p>
                <Video className="inline-block mr-2" />
                Address: 123 Travel Place, Adventure City
                </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full -z-10">
          <img src="/Travel-Place-footer-2.svg" alt="Travel Place Footer" className="w-full" />
        </div>
      </div>
    )
}