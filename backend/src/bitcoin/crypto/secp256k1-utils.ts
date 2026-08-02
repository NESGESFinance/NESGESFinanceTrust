/**
 * Operaciones sobre la curva elíptica secp256k1 (la usada por Bitcoin).
 *
 * Implementa las operaciones de grupo básicas (suma y multiplicación escalar)
 * en aritmética modular con `bigint`, la derivación de la clave pública a
 * partir de la privada y la (de)compresión de claves públicas.
 *
 * AVISO: esta implementación es didáctica y autocontenida (sin dependencias
 * externas). Para firmar/verificar en producción con resistencia a canales
 * laterales, utilice una biblioteca auditada (p. ej. `@noble/secp256k1` o
 * `secp256k1`). Aquí no se implementa la generación de firmas ECDSA.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/** Parámetros del dominio de la curva secp256k1: y² = x³ + 7 (mod p). */
export const SECP256K1 = {
  // Primo del campo finito.
  P: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  // Orden del grupo generador.
  N: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  // Coeficientes de la curva.
  A: 0n,
  B: 7n,
  // Punto generador G (Gx, Gy).
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
} as const;

/** Un punto de la curva en coordenadas afines. `null` representa el infinito. */
export type Point = { x: bigint; y: bigint } | null;

/** Módulo que siempre devuelve un resultado no negativo. */
function mod(a: bigint, m: bigint = SECP256K1.P): bigint {
  return ((a % m) + m) % m;
}

/** Inverso modular mediante el algoritmo extendido de Euclides. */
function modInverse(a: bigint, m: bigint = SECP256K1.P): bigint {
  let [oldR, r] = [mod(a, m), m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) {
    throw new Error('No existe inverso modular (los números no son coprimos).');
  }
  return mod(oldS, m);
}

/** Suma de dos puntos de la curva. */
export function pointAdd(p: Point, q: Point): Point {
  if (p === null) return q;
  if (q === null) return p;

  if (p.x === q.x && mod(p.y + q.y) === 0n) {
    return null; // P + (-P) = infinito.
  }

  let lambda: bigint;
  if (p.x === q.x && p.y === q.y) {
    // Duplicación de punto.
    lambda = mod((3n * p.x * p.x + SECP256K1.A) * modInverse(2n * p.y));
  } else {
    lambda = mod((q.y - p.y) * modInverse(q.x - p.x));
  }

  const rx = mod(lambda * lambda - p.x - q.x);
  const ry = mod(lambda * (p.x - rx) - p.y);
  return { x: rx, y: ry };
}

/** Multiplicación escalar k·P mediante el método "double-and-add". */
export function pointMultiply(k: bigint, point: Point): Point {
  let result: Point = null;
  let addend = point;
  let n = mod(k, SECP256K1.N);

  while (n > 0n) {
    if (n & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointAdd(addend, addend);
    n >>= 1n;
  }
  return result;
}

/**
 * Deriva el punto de clave pública a partir de una clave privada.
 * @param privateKey Clave privada (32 bytes o bigint).
 * @returns Punto de la clave pública en la curva.
 */
export function derivePublicKey(privateKey: Buffer | bigint): Point {
  const k = typeof privateKey === 'bigint' ? privateKey : BigInt('0x' + privateKey.toString('hex'));
  if (k <= 0n || k >= SECP256K1.N) {
    throw new Error('Clave privada fuera del rango válido [1, N-1].');
  }
  return pointMultiply(k, { x: SECP256K1.Gx, y: SECP256K1.Gy });
}

/**
 * Serializa una clave pública en formato comprimido (33 bytes).
 * El prefijo 0x02/0x03 indica la paridad de la coordenada Y.
 * @param point Punto de la clave pública.
 * @returns Buffer de 33 bytes.
 */
export function compressPublicKey(point: Point): Buffer {
  if (point === null) {
    throw new Error('No se puede comprimir el punto en el infinito.');
  }
  const prefix = point.y % 2n === 0n ? 0x02 : 0x03;
  const xHex = point.x.toString(16).padStart(64, '0');
  return Buffer.concat([Buffer.from([prefix]), Buffer.from(xHex, 'hex')]);
}

/**
 * Serializa una clave pública en formato sin comprimir (65 bytes, prefijo 0x04).
 * @param point Punto de la clave pública.
 * @returns Buffer de 65 bytes.
 */
export function uncompressedPublicKey(point: Point): Buffer {
  if (point === null) {
    throw new Error('No se puede serializar el punto en el infinito.');
  }
  const xHex = point.x.toString(16).padStart(64, '0');
  const yHex = point.y.toString(16).padStart(64, '0');
  return Buffer.concat([Buffer.from([0x04]), Buffer.from(xHex, 'hex'), Buffer.from(yHex, 'hex')]);
}

/**
 * Verifica que un punto pertenece a la curva secp256k1 (y² = x³ + 7 mod p).
 * @param point Punto a validar.
 * @returns `true` si el punto está en la curva.
 */
export function isOnCurve(point: Point): boolean {
  if (point === null) {
    return true; // El infinito pertenece al grupo.
  }
  const left = mod(point.y * point.y);
  const right = mod(point.x * point.x * point.x + SECP256K1.B);
  return left === right;
}
