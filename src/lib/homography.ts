import { gaussianElimination, multiply, transpose } from './matrix';

export type Point = { x: number; y: number };

// Solves for the homography matrix H using the Direct Linear Transformation (DLT) algorithm.
// At least 4 point correspondences are required.
export function calculateHomography(points1: Point[], points2: Point[]): number[][] | null {
  if (points1.length < 4 || points1.length !== points2.length) {
    return null;
  }

  const n = points1.length;
  const A: number[][] = [];

  for (let i = 0; i < n; i++) {
    const p1 = points1[i];
    const p2 = points2[i];
    A.push([-p1.x, -p1.y, -1, 0, 0, 0, p1.x * p2.x, p1.y * p2.x, p2.x]);
    A.push([0, 0, 0, -p1.x, -p1.y, -1, p1.x * p2.y, p1.y * p2.y, p2.y]);
  }
  
  if (n === 4) {
    // For exactly 4 points, we can solve Ah=0 by finding the null space of A.
    // A is 8x9, rank is 8. Null space is 1D.
    const h = solveHomogeneous(A);
    if (!h) return null;

    const H = [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], h[8]],
    ];
    
    // Normalize
    const h22 = H[2][2];
    if (Math.abs(h22) < 1e-9) return H; // Avoid division by zero
    for(let i = 0; i < 3; i++) {
        for(let j = 0; j < 3; j++) {
            H[i][j] /= h22;
        }
    }
    return H;
  } else {
    // For more than 4 points, we need to solve an overdetermined system.
    // This is typically done with SVD by finding the eigenvector of A^T A
    // corresponding to the smallest eigenvalue. This is more complex to implement
    // without a full math library. We'll return null for this case for now.
    // A robust implementation would use SVD here.
    return null;
  }
}

// Solves Ah=0 for an 8x9 matrix A using Gaussian elimination.
function solveHomogeneous(A: number[][]): number[] | null {
    try {
        const B = gaussianElimination(A);
        
        // After Gaussian elimination on an 8x9 matrix of rank 8,
        // we can solve for h by setting h8=1 and using back substitution.
        const h = new Array(9).fill(0);
        h[8] = 1;

        for (let i = 7; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < 9; j++) {
                sum += B[i][j] * h[j];
            }
            if (Math.abs(B[i][i]) < 1e-9) {
              // This indicates a rank-deficient matrix, which shouldn't happen with 4 non-collinear points.
              // For simplicity, we continue, but a robust solution would handle this.
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
