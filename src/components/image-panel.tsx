"use client";

import type { Point } from "@/lib/homography";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImagePanelProps = {
  imageUrl: string | null;
  points: Point[];
  onPointAdd: (point: Point) => void;
  dimensions: { width: number, height: number } | null;
  isNext: boolean;
};

export default function ImagePanel({ imageUrl, points, onPointAdd, dimensions, isNext }: ImagePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dimensions || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Get click position relative to the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale click position to original image dimensions
    const originalX = (x / displayWidth) * dimensions.width;
    const originalY = (y / displayHeight) * dimensions.height;

    onPointAdd({ x: originalX, y: originalY });
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative aspect-video w-full bg-muted/20 rounded-lg overflow-hidden cursor-crosshair transition-all duration-300",
        isNext && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        !imageUrl && "flex items-center justify-center"
      )}
      onClick={handleContainerClick}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="Uploaded image" layout="fill" objectFit="contain" />
      ) : (
        <p className="text-muted-foreground">Upload an image to begin</p>
      )}

      {imageUrl && points.map((point, index) => {
        if (!dimensions || !containerRef.current) return null;
        
        const displayWidth = containerRef.current.clientWidth;
        const displayHeight = containerRef.current.clientHeight;

        const imageAspectRatio = dimensions.width / dimensions.height;
        const containerAspectRatio = displayWidth / displayHeight;

        let scale: number;
        let offsetX = 0;
        let offsetY = 0;

        if (imageAspectRatio > containerAspectRatio) {
            scale = displayWidth / dimensions.width;
            offsetY = (displayHeight - dimensions.height * scale) / 2;
        } else {
            scale = displayHeight / dimensions.height;
            offsetX = (displayWidth - dimensions.width * scale) / 2;
        }

        const left = point.x * scale + offsetX;
        const top = point.y * scale + offsetY;
        
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
    </div>
  );
}
