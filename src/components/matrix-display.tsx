"use client";

type MatrixDisplayProps = {
  matrix: number[][] | null;
};

export default function MatrixDisplay({ matrix }: MatrixDisplayProps) {
  if (!matrix) {
    return (
      <div className="flex items-center justify-center h-32 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Matrix will be displayed here.</p>
      </div>
    );
  }

  return (
    <div className="font-mono text-center p-4 bg-muted/20 rounded-lg">
      <div className="grid grid-cols-3 gap-4">
        {matrix.flat().map((value, index) => (
          <div key={index} className="p-2 bg-background rounded-md shadow-inner text-lg">
            {value.toFixed(4)}
          </div>
        ))}
      </div>
    </div>
  );
}
