"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, X, ZoomIn, ZoomOut } from "lucide-react";

const IMAGE_URL =
  "https://res.cloudinary.com/dt6nb7hiv/image/upload/v1771535638/WhatsApp_Image_2026-02-19_at_3.09.43_PM_1_wa7ogi.jpg";

export default function OfertaLaboralModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const openModal = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoom((value) => Math.min(value + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom((value) => {
      const newZoom = Math.max(value - 0.25, 0.5);
      if (newZoom <= 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", onEscape);
    }

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div className="text-center items-center flex flex-col mt-4 mb-5">
        <span className="text-2xl font-bold">OFERTA LABORAL</span>
        <button type="button" onClick={openModal} className="mt-5">
          <img
            src={IMAGE_URL}
            alt="help_wanted"
            className="mx-auto w-full max-w-sm md:max-w-md aspect-[3/4] object-cover rounded-lg shadow-lg cursor-zoom-in transition-transform hover:scale-[1.02] active:scale-[0.98]"
          />
        </button>

        {/* Botones de contacto cuando la imagen no está expandida */}
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <a
            href="tel:+50223168151"
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-900 text-white rounded-full font-medium shadow-md hover:bg-purple-800 transition-all active:scale-95"
          >
            <Phone size={18} />
            Llamar al PBX
          </a>
          <a
            href="mailto:rrhh@travelplacegt.com"
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-purple-900 border-2 border-purple-900 rounded-full font-medium shadow-md hover:bg-purple-50 transition-all active:scale-95"
          >
            <Mail size={18} />
            Enviar Correo
          </a>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Botón de cerrar en la esquina superior derecha */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all z-[110]"
              aria-label="Cerrar"
            >
              <X size={24} />
            </button>

            {/* Controles de zoom tipo "pill" */}
            <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-2xl z-[110] border border-gray-200">
              <button
                type="button"
                onClick={zoomOut}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                title="Alejar"
              >
                <ZoomOut size={20} />
              </button>

              <span className="text-sm font-bold text-gray-800 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                onClick={zoomIn}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                title="Acercar"
              >
                <ZoomIn size={20} />
              </button>
            </div>

            <img
              src={IMAGE_URL}
              alt="help_wanted_modal"
              className="max-h-[80vh] w-auto object-contain rounded-lg select-none"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                cursor:
                  zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            />
          </div>
        </div>
      )}
    </>
  );
}
