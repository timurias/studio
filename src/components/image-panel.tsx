
"use client";

import type { Point } from "@/lib/homography";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImagePanelProps = {
  imageUrl: string | null;
  points: Point[];
  onPointAdd: (point: Point) => void;
  dimensions: { width: number, height: number } | null;
  isNext: boolean;
};

const LOUPE_SIZE = 120; // Size of the zoom loupe in pixels
const ZOOM_FACTOR = 3; // How much to zoom in

export default function ImagePanel({ imageUrl, points, onPointAdd, dimensions, isNext }: ImagePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const getPointPosition = (point: Point) => {
    const image = imageRef.current;
    if (!image) return { left: 0, top: 0 };
    const { width, height, left, top } = image.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    
    const displayLeft = (point.x / dimensions!.width) * width + left - containerRect.left;
    const displayTop = (point.y / dimensions!.height) * height + top - containerRect.top;

    return { left: displayLeft, top: displayTop };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) {
        setMousePos(null);
        return;
    }
    const imageRect = imageRef.current.getBoundingClientRect();
    const containerRect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX;
    const y = e.clientY;
    
    // Check if mouse is within the actual image bounds
    if (x >= imageRect.left && x <= imageRect.right && y >= imageRect.top && y <= imageRect.bottom) {
        // Position relative to the container
      setMousePos({ x: x - containerRect.left, y: y - containerRect.top });
    } else {
      setMousePos(null);
    }
  };
  
  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dimensions || !imageRef.current) return;
    
    const imageRect = imageRef.current.getBoundingClientRect();
    
    const x = e.clientX;
    const y = e.clientY;

    if (x < imageRect.left || x > imageRect.right || y < imageRect.top || y > imageRect.bottom) {
      return; 
    }

    const imageX = x - imageRect.left;
    const imageY = y - imageRect.top;
    const originalX = (imageX / imageRect.width) * dimensions.width;
    const originalY = (imageY / imageRect.height) * dimensions.height;

    onPointAdd({ x: originalX, y: originalY });
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full bg-muted/20 rounded-lg overflow-hidden cursor-crosshair transition-all duration-300",
        "flex items-center justify-center", // Center the content
        isNext && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        !imageUrl && "aspect-video" // Keep aspect ratio for placeholder
      )}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {imageUrl && dimensions ? (
        <div 
          className="relative w-full h-full"
          style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
        >
          <Image 
            ref={imageRef}
            src={imageUrl} 
            alt="Uploaded image" 
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full object-contain"
          />
        </div>
      ) : <p className="text-muted-foreground">Upload an image to begin</p>}

      {imageUrl && points.map((point, index) => {
        if (!dimensions || !imageRef.current) return null;
        
        const { left, top } = getPointPosition(point);
        
        return (
            <div
                key={index}
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${left}px`, top: `${top}px` }}
            >
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                    <circle cx="10" cy="10" r="3" fill="hsl(var(--primary))" />
                    <circle cx="10" cy="10" r="8" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                    <line x1="10" y1="0" x2="10" y2="6" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                    <line x1="10" y1="14" x2="10" y2="20" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                    <line x1="0" y1="10" x2="6" y2="10" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                    <line x1="14" y1="10" x2="20" y2="10" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                </svg>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {index + 1}
                </span>
            </div>
        );
      })}

      {mousePos && imageUrl && dimensions && imageRef.current && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-primary bg-background shadow-lg"
          style={{
            left: `${mousePos.x - LOUPE_SIZE / 2}px`,
            top: `${mousePos.y - LOUPE_SIZE / 2}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: imageRef.current.getBoundingClientRect().width * ZOOM_FACTOR,
              height: imageRef.current.getBoundingClientRect().height * ZOOM_FACTOR,
              left: `-${(mousePos.x - (imageRef.current.getBoundingClientRect().left - containerRef.current!.getBoundingClientRect().left)) * ZOOM_FACTOR - LOUPE_SIZE / 2}px`,
              top: `-${(mousePos.y - (imageRef.current.getBoundingClientRect().top - containerRef.current!.getBoundingClientRect().top)) * ZOOM_FACTOR - LOUPE_SIZE / 2}px`,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
            }}
          />
          {/* Crosshair in the middle of the loupe */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary/50 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 h-full w-[1px] bg-primary/50 -translate-x-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
}
