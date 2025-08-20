// Simple matrix utilities for homography calculation.

// Performs Gaussian elimination on a matrix A.
export function gaussianElimination(A: number[][]): number[][] {
  const m = A.length;
  const n = A[0].length;
  const B = A.map(row => [...row]); // Create a copy

  let h = 0; /* pivot row */
  let k = 0; /* pivot col */

  while (h < m && k < n) {
    // Find the k-th pivot
    let i_max = h;
    for (let i = h + 1; i < m; i++) {
      if (Math.abs(B[i][k]) > Math.abs(B[i_max][k])) {
        i_max = i;
      }
    }

    if (Math.abs(B[i_max][k]) < 1e-9) {
      // No pivot in this column, pass to next column
      k++;
    } else {
      // Swap rows
      [B[h], B[i_max]] = [B[i_max], B[h]];

      // Do for all rows below pivot
      for (let i = h + 1; i < m; i++) {
        const f = B[i][k] / B[h][k];
        // Do for all remaining elements in current row
        B[i][k] = 0;
        for (let j = k + 1; j < n; j++) {
          B[i][j] -= B[h][j] * f;
        }
      }
      h++;
      k++;
    }
  }
  return B;
}

// Multiplies two matrices A and B
export function multiply(A: number[][], B: number[][]): number[][] {
  const A_rows = A.length;
  const A_cols = A[0].length;
  const B_rows = B.length;
  const B_cols = B[0].length;

  if (A_cols !== B_rows) {
    throw new Error("Matrix dimensions are not compatible for multiplication");
  }

  const C: number[][] = new Array(A_rows).fill(0).map(() => new Array(B_cols).fill(0));

  for (let i = 0; i < A_rows; i++) {
    for (let j = 0; j < B_cols; j++) {
      for (let k = 0; k < A_cols; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return C;
}

// Transposes a matrix
export function transpose(A: number[][]): number[][] {
    const rows = A.length;
    const cols = A[0].length;
    const B: number[][] = new Array(cols).fill(0).map(() => new Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            B[j][i] = A[i][j];
        }
    }
    return B;
}


// Inverts a 3x3 matrix
export function invert3x3(A: number[][]): number[][] | null {
  if (A.length !== 3 || A[0].length !== 3) {
    throw new Error("Matrix must be 3x3 to be inverted by this function.");
  }

  const m = A;
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (Math.abs(det) < 1e-9) {
    return null; // Matrix is not invertible
  }

  const invDet = 1.0 / det;

  const invA: number[][] = [
    new Array(3),
    new Array(3),
    new Array(3),
  ];

  invA[0][0] = (m[1][1] * m[2][2] - m[2][1] * m[1][2]) * invDet;
  invA[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet;
  invA[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet;
  invA[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet;
  invA[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet;
  invA[1][2] = (m[1][0] * m[0][2] - m[0][0] * m[1][2]) * invDet;
  invA[2][0] = (m[1][0] * m[2][1] - m[2][0] * m[1][1]) * invDet;
  invA[2][1] = (m[2][0] * m[0][1] - m[0][0] * m[2][1]) * invDet;
  invA[2][2] = (m[0][0] * m[1][1] - m[1][0] * m[0][1]) * invDet;

  return invA;
}

// Multiplies a matrix by a vector
export function multiplyMatrixVector(A: number[][], v: number[]): number[] {
  const rows = A.length;
  const cols = A[0].length;
  if (cols !== v.length) {
    throw new Error("Matrix and vector dimensions are not compatible for multiplication.");
  }
  const result = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[i] += A[i][j] * v[j];
    }
  }
  return result;
}
