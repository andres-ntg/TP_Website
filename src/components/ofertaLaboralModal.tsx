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
       
        </div>
      
    </>
  );
}
