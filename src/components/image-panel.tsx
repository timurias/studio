
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
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number, height: number, top: number, left: number }>({ width: 0, height: 0, top: 0, left: 0 });

  const calculateDisplaySize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !dimensions) {
      setDisplaySize({ width: 0, height: 0, top: 0, left: 0 });
      return;
    }

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const { width: naturalWidth, height: naturalHeight } = dimensions;

    if (containerWidth === 0 || containerHeight === 0 || naturalWidth === 0 || naturalHeight === 0) {
      return;
    }

    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let width, height, top = 0, left = 0;
    if (imageAspectRatio > containerAspectRatio) {
      width = containerWidth;
      height = containerWidth / imageAspectRatio;
      top = (containerHeight - height) / 2;
    } else {
      height = containerHeight;
      width = containerHeight * imageAspectRatio;
      left = (containerWidth - width) / 2;
    }
    setDisplaySize({ width, height, top, left });
  }, [dimensions]);

  useEffect(() => {
    calculateDisplaySize();
    const resizeObserver = new ResizeObserver(() => calculateDisplaySize());
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    return () => {
        if(containerRef.current) {
            resizeObserver.unobserve(containerRef.current);
        }
    };
  }, [calculateDisplaySize, imageUrl]);


  const getPointPosition = (point: Point) => {
    if (!dimensions || !displaySize.width || !displaySize.height) return { left: 0, top: 0 };
    const left = (point.x / dimensions.width) * displaySize.width + displaySize.left;
    const top = (point.y / dimensions.height) * displaySize.height + displaySize.top;
    return { left, top };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is within the actual image bounds
    if (x >= displaySize.left && x <= displaySize.left + displaySize.width &&
        y >= displaySize.top && y <= displaySize.top + displaySize.height) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  };
  
  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dimensions || !displaySize.width || !displaySize.height) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < displaySize.left || x > displaySize.left + displaySize.width ||
        y < displaySize.top || y > displaySize.top + displaySize.height) {
      return; 
    }

    const imageX = x - displaySize.left;
    const imageY = y - displaySize.top;
    const originalX = (imageX / displaySize.width) * dimensions.width;
    const originalY = (imageY / displaySize.height) * dimensions.height;

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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {imageUrl && (
        <div style={{ position: 'absolute', top: displaySize.top, left: displaySize.left, width: displaySize.width, height: displaySize.height }}>
            <Image src={imageUrl} alt="Uploaded image" layout="fill" objectFit="contain" onLoadingComplete={calculateDisplaySize} />
        </div>
      )}
      {!imageUrl && <p className="text-muted-foreground">Upload an image to begin</p>}


      {imageUrl && points.map((point, index) => {
        if (!dimensions) return null;
        
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

      {mousePos && imageUrl && dimensions && displaySize.width > 0 && (
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
              width: `${displaySize.width * ZOOM_FACTOR}px`,
              height: `${displaySize.height * ZOOM_FACTOR}px`,
              left: `${-(mousePos.x - displaySize.left) * ZOOM_FACTOR + LOUPE_SIZE / 2}px`,
              top: `${-(mousePos.y - displaySize.top) * ZOOM_FACTOR + LOUPE_SIZE / 2}px`,
            }}
          >
            <Image src={imageUrl} alt="Zoomed view" layout="fill" objectFit="contain" />
          </div>
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
