import { gaussianElimination, multiplyMatrixVector } from './matrix';

export type Point = { x: number; y: number };


function solveHomographyFor4Points(points1: Point[], points2: Point[]): number[][] | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = points1[i];
    const p2 = points2[i];
    A.push([-p1.x, -p1.y, -1, 0, 0, 0, p1.x * p2.x, p1.y * p2.x, p2.x]);
    A.push([0, 0, 0, -p1.x, -p1.y, -1, p1.x * p2.y, p1.y * p2.y, p2.y]);
  }
  
  const h = solveHomogeneous(A);
  if (!h) return null;

  const H = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]],
  ];
  
  const h22 = H[2][2];
  if (Math.abs(h22) < 1e-9) return H; 
  for(let i = 0; i < 3; i++) {
      for(let j = 0; j < 3; j++) {
          H[i][j] /= h22;
      }
  }
  return H;
}

function solveHomogeneous(A: number[][]): number[] | null {
    try {
        const B = gaussianElimination(A);
        
        const h = new Array(9).fill(0);
        h[8] = 1;

        for (let i = 7; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < 9; j++) {
                sum += B[i][j] * h[j];
            }
            if (Math.abs(B[i][i]) < 1e-9) {
              h[i] = 0;
            } else {
              h[i] = -sum / B[i][i];
            }
        }
        return h;
    } catch (e) {
        console.error("Failed to solve homogeneous system:", e);
        return null;
    }
}

/**
 * Calculates the homography matrix using the RANSAC algorithm.
 * This makes the calculation robust to outliers when more than 4 points are provided.
 */
export function calculateHomography(points1: Point[], points2: Point[]): number[][] | null {
  const n_points = points1.length;
  if (n_points < 4 || n_points !== points2.length) {
    return null;
  }

  // If exactly 4 points, use the direct method without RANSAC.
  if (n_points === 4) {
    return solveHomographyFor4Points(points1, points2);
  }

  const iterations = 1000;
  const threshold = 5.0; // Distance threshold in pixels for a point to be considered an inlier
  let bestH: number[][] | null = null;
  let maxInliers = -1;

  for (let i = 0; i < iterations; i++) {
    // 1. Randomly select 4 points
    const indices = new Set<number>();
    while (indices.size < 4) {
      indices.add(Math.floor(Math.random() * n_points));
    }
    const randomIndices = Array.from(indices);
    const samplePoints1 = randomIndices.map(idx => points1[idx]);
    const samplePoints2 = randomIndices.map(idx => points2[idx]);
    
    // 2. Compute homography for the sample
    const H = solveHomographyFor4Points(samplePoints1, samplePoints2);
    if (!H) {
      continue;
    }

    // 3. Count inliers
    let inliers = 0;
    for (let j = 0; j < n_points; j++) {
      const p1 = points1[j];
      const p2 = points2[j];

      const projected = multiplyMatrixVector(H, [p1.x, p1.y, 1]);
      if (Math.abs(projected[2]) < 1e-9) continue;

      const projectedX = projected[0] / projected[2];
      const projectedY = projected[1] / projected[2];

      const dx = p2.x - projectedX;
      const dy = p2.y - projectedY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < threshold) {
        inliers++;
      }
    }

    // 4. Update best homography
    if (inliers > maxInliers) {
      maxInliers = inliers;
      bestH = H;
    }
  }

  // A very basic check to see if we found a reasonable model.
  // You might want to adjust this logic based on your needs, e.g., require a certain percentage of inliers.
  if (maxInliers < 4) {
      return null;
  }

  return bestH;
}
