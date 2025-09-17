
"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import ImagePanel from "./image-panel";
import MatrixDisplay from "./matrix-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateHomography, type Point } from "@/lib/homography";
import { invert3x3, multiplyMatrixVector } from "@/lib/matrix";
import { autoDetectPoints } from "@/ai/flows/auto-detect-points";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Calculator, Sparkles, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

type ImageState = {
  file: File | null;
  url: string | null;
  dimensions: { width: number; height: number } | null;
};

const initialImageState: ImageState = {
  file: null,
  url: null,
  dimensions: null,
};

export default function HomoVisionClient() {
  const [image1, setImage1] = useState<ImageState>(initialImageState);
  const [image2, setImage2] = useState<ImageState>(initialImageState);
  const [points1, setPoints1] = useState<Point[]>([]);
  const [points2, setPoints2] = useState<Point[]>([]);
  const [homographyMatrix, setHomographyMatrix] = useState<number[][] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [nextImageToMark, setNextImageToMark] = useState<1 | 2>(1);
  const [splitX, setSplitX] = useState(50);
  const [splitY, setSplitY] = useState(50);

  console.log("Hello, TypeScript!");

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup object URLs
    return () => {
      if (image1.url) URL.revokeObjectURL(image1.url);
      if (image2.url) URL.revokeObjectURL(image2.url);
    };
  }, [image1.url, image2.url]);
  
  // Redraw canvas when sliders or matrix change
  useEffect(() => {
    console.log("Hello, use effect!");
    if (homographyMatrix && image1.url && image2.url) {
      drawTransformedImage(homographyMatrix);
    }
  }, [splitX, splitY, homographyMatrix, image1.url, image2.url]);


  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        if (imageNumber === 1) {
          setImage1({ file, url, dimensions });
        } else {
          setImage2({ file, url, dimensions });
        }
      };
      img.src = url;
    }
  };

  const handlePointAdd = (point: Point, imageNumber: 1 | 2) => {
    if (imageNumber === 1 && nextImageToMark === 1) {
      setPoints1([...points1, point]);
      setNextImageToMark(2);
      toast({ title: "Point added to Image 1", description: "Now, please select the corresponding point on Image 2." });
    } else if (imageNumber === 2 && nextImageToMark === 2) {
      setPoints2([...points2, point]);
      setNextImageToMark(1);
      toast({ title: "Point added to Image 2", description: "Point pair complete. Select a new point on Image 1." });
    } else {
       toast({
        variant: "destructive",
        title: "Incorrect Image Clicked",
        description: `Please add a point to Image ${nextImageToMark}.`,
      });
    }
  };

  const clearLastPointPair = () => {
    if (points1.length === 0) return;
    if (nextImageToMark === 1) { // A full pair has been added or points were auto-detected
      setPoints1(points1.slice(0, -1));
      setPoints2(points2.slice(0, -1));
    } else { // Only the first point of a pair has been added
      setPoints1(points1.slice(0, -1));
      setNextImageToMark(1);
    }
    toast({ title: "Last point pair removed", description: "The last point pair has been cleared." });
  };

  const handleCalculateHomography = () => {
    if (points1.length < 4) {
      toast({ variant: 'destructive', title: 'Error', description: 'At least 4 pairs of points are required.' });
      return;
    }
    if (points1.length !== points2.length) {
      toast({ variant: 'destructive', title: 'Error', description: 'The number of points on both images must be equal.'});
      return;
    }
    setIsCalculating(true);
    setTimeout(() => {
        const matrix = calculateHomography(points1, points2);
        setHomographyMatrix(matrix);
        if (matrix) {
            toast({ title: "Success", description: "Homography matrix calculated." });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate homography. Ensure points are not collinear.' });
        }
        setIsCalculating(false);
    }, 50); // a small delay for UX
  };
  
  const drawTransformedImage = (matrix: number[][]) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !image1.url || !image2.url || !image1.dimensions || !image2.dimensions) return;


    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const destWidth = image2.dimensions.width;
    const destHeight = image2.dimensions.height;
    canvas.width = destWidth;
    canvas.height = destHeight;

    const sourceImage = new Image();
    const destImage = new Image();

    let sourceLoaded = false;
    let destLoaded = false;

    const onImagesLoaded = () => {
        if (!sourceLoaded || !destLoaded) return;

        // 1. Draw destination image as the base
        ctx.drawImage(destImage, 0, 0, destWidth, destHeight);

        // 2. Prepare transformed source image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceImage.width;
        tempCanvas.height = sourceImage.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) return;
        tempCtx.drawImage(sourceImage, 0, 0);
        const sourceImageData = tempCtx.getImageData(0, 0, sourceImage.width, sourceImage.height);
        const sourceData = sourceImageData.data;

        const invMatrix = invert3x3(matrix);
        if (!invMatrix) {
            toast({ variant: "destructive", title: "Error", description: "Matrix is not invertible." });
            return;
        }

        const transformedImageData = ctx.createImageData(destWidth, destHeight);
        const transformedData = transformedImageData.data;

        for (let y = 0; y < destHeight; y++) {
            for (let x = 0; x < destWidth; x++) {
                const destVec = [x, y, 1];
                const sourceVec = multiplyMatrixVector(invMatrix, destVec);

                const sx = sourceVec[0] / sourceVec[2];
                const sy = sourceVec[1] / sourceVec[2];

                if (sx >= 0 && sx < sourceImage.width && sy >= 0 && sy < sourceImage.height) {
                    // Using bilinear interpolation for smoother results
                    const x_floor = Math.floor(sx);
                    const y_floor = Math.floor(sy);
                    const x_ceil = Math.min(sourceImage.width - 1, x_floor + 1);
                    const y_ceil = Math.min(sourceImage.height - 1, y_floor + 1);

                    const tx = sx - x_floor;
                    const ty = sy - y_floor;

                    const q11_index = (y_floor * sourceImage.width + x_floor) * 4;
                    const q21_index = (y_floor * sourceImage.width + x_ceil) * 4;
                    const q12_index = (y_ceil * sourceImage.width + x_floor) * 4;
                    const q22_index = (y_ceil * sourceImage.width + x_ceil) * 4;
                    
                    const destIndex = (y * destWidth + x) * 4;

                    for (let c = 0; c < 4; c++) { // Iterate over R, G, B, A
                        const b1 = sourceData[q11_index + c] * (1 - tx) + sourceData[q21_index + c] * tx;
                        const b2 = sourceData[q12_index + c] * (1 - tx) + sourceData[q22_index + c] * tx;
                        transformedData[destIndex + c] = b1 * (1 - ty) + b2 * ty;
                    }
                }
            }
        }
        
        // 3. Draw the transformed source image on top, clipped by the sliders
        const splitPixelX = (splitX / 100) * destWidth;
        const splitPixelY = (splitY / 100) * destHeight;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitPixelX, splitPixelY);
        ctx.clip();
        ctx.putImageData(transformedImageData, 0, 0);
        ctx.restore();

        // 4. Draw split lines
        ctx.save();
        ctx.strokeStyle = "hsl(var(--primary))";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(splitPixelX, 0);
        ctx.lineTo(splitPixelX, destHeight);
        ctx.stroke();
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, splitPixelY);
        ctx.lineTo(destWidth, splitPixelY);
        ctx.stroke();
        ctx.restore();
    };

    sourceImage.onload = () => {
        sourceLoaded = true;
        onImagesLoaded();
    };
    destImage.onload = () => {
        destLoaded = true;
        onImagesLoaded();
    };

    sourceImage.src = image1.url!;
    destImage.src = image2.url!;
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const handleAutoDetect = async () => {
    if (!image1.file || !image2.file) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please upload both images first.' });
      return;
    }
    setIsAiDetecting(true);
    try {
      const [image1DataUri, image2DataUri] = await Promise.all([
          fileToDataUri(image1.file),
          fileToDataUri(image2.file),
      ]);

      const result = await autoDetectPoints({ image1DataUri, image2DataUri });

      const newPoints1 = result.image1Points.map(p => ({ x: p[0], y: p[1] }));
      const newPoints2 = result.image2Points.map(p => ({ x: p[0], y: p[1] }));
      
      setPoints1(newPoints1);
      setPoints2(newPoints2);
      setNextImageToMark(1);
      toast({ title: 'AI Detection Successful', description: `${newPoints1.length} point pairs detected.` });
    } catch (error) {
        console.error("AI point detection failed:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to detect points automatically.' });
    } finally {
        setIsAiDetecting(false);
    }
  };

  const resetAll = () => {
    setImage1(initialImageState);
    setImage2(initialImageState);
    setPoints1([]);
    setPoints2([]);
    setHomographyMatrix(null);
    setNextImageToMark(1);
    setSplitX(50);
    setSplitY(50);
    if (previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }
    // Reset file inputs
    const input1 = document.getElementById('image1-upload') as HTMLInputElement;
    const input2 = document.getElementById('image2-upload') as HTMLInputElement;
    if (input1) input1.value = '';
    if (input2) input2.value = '';

    toast({ title: 'Reset', description: 'Application state has been cleared.' });
  };
  
  const hasPoints = points1.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          HomoVision
        </h1>
        <p className="text-muted-foreground mt-2">Interactive Image Homography Calculator</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Image 1 (Source)
              <Label htmlFor="image1-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span><Upload className="mr-2 h-4 w-4" /> Upload</span>
                </Button>
                <Input id="image1-upload" type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 1)} />
              </Label>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePanel imageUrl={image1.url} points={points1} onPointAdd={p => handlePointAdd(p, 1)} dimensions={image1.dimensions} isNext={nextImageToMark === 1} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Image 2 (Destination)
              <Label htmlFor="image2-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span><Upload className="mr-2 h-4 w-4" /> Upload</span>
                </Button>
                <Input id="image2-upload" type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 2)} />
              </Label>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePanel imageUrl={image2.url} points={points2} onPointAdd={p => handlePointAdd(p, 2)} dimensions={image2.dimensions} isNext={nextImageToMark === 2} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-center gap-4">
            <Button onClick={handleAutoDetect} disabled={isAiDetecting || !image1.file || !image2.file}>
                {isAiDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                AI Detect Points
            </Button>
            <Button onClick={handleCalculateHomography} disabled={isCalculating || points1.length < 4 || points1.length !== points2.length}>
                {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                Calculate Homography
            </Button>
             <Button variant="outline" onClick={clearLastPointPair} disabled={points1.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Last Point
            </Button>
            <Button variant="destructive" onClick={resetAll}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All
            </Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Calculated Homography Matrix</CardTitle></CardHeader>
          <CardContent>
            <MatrixDisplay matrix={homographyMatrix} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transformed Image Preview</CardTitle>
          </CardHeader>
          <CardContent className="relative flex flex-col items-center justify-center gap-4">
             <div className="relative w-full" style={image2.dimensions ? { aspectRatio: `${image2.dimensions.width} / ${image2.dimensions.height}` } : {aspectRatio: '16 / 9'}}>
                <canvas ref={previewCanvasRef} className="absolute inset-0 w-full h-full rounded-md bg-muted/20" />
                {!homographyMatrix && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Preview will appear here.</div>}
            </div>
            {homographyMatrix && (
              <div className="w-full grid grid-cols-[auto_1fr] items-center gap-4 px-2">
                  <Label htmlFor="split-x" className="font-mono">X:</Label>
                  <Slider id="split-x" value={[splitX]} onValueChange={([val]) => setSplitX(val)} max={100} step={1} />
                  <Label htmlFor="split-y" className="font-mono">Y:</Label>
                  <Slider id="split-y" value={[splitY]} onValueChange={([val]) => setSplitY(val)} max={100} step={1} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Selected Points ({points1.length})</CardTitle></CardHeader>
        <CardContent className="max-h-48 overflow-y-auto">
          {!hasPoints && <p className="text-muted-foreground">No points selected yet.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm font-mono">
          {points1.map((p, i) => (
            <div key={i} className="bg-muted/30 p-2 rounded-md">
              <p className="font-bold">Pair {i+1}</p>
              <p>S: ({p.x.toFixed(0)}, {p.y.toFixed(0)})</p>
              {points2[i] && <p>D: ({points2[i].x.toFixed(0)}, {points2[i].y.toFixed(0)})</p>}
            </div>
          ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    