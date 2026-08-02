/**
 * Utilidades de hashing usadas en Bitcoin.
 *
 * Implementa las primitivas criptográficas fundamentales del protocolo Bitcoin
 * sobre el módulo `crypto` nativo de Node.js:
 *   - SHA-256 y doble SHA-256 (hash256).
 *   - Hash160 = RIPEMD160(SHA256(x)), usado en direcciones P2PKH/P2SH.
 *   - Raíz de Merkle a partir de una lista de txids.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import { createHash } from 'crypto';

/**
 * Calcula el hash SHA-256 de un buffer.
 * @param data Datos de entrada.
 * @returns Digest SHA-256 (32 bytes).
 */
export function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

/**
 * Calcula el doble SHA-256 (SHA256(SHA256(x))).
 * Es el hash usado para identificadores de bloque y transacción en Bitcoin.
 * @param data Datos de entrada.
 * @returns Digest de 32 bytes.
 */
export function sha256d(data: Buffer): Buffer {
  return sha256(sha256(data));
}

/** Alias semántico de `sha256d` (hash256 en la terminología de Bitcoin). */
export function hash256(data: Buffer): Buffer {
  return sha256d(data);
}

/**
 * Calcula RIPEMD-160 de un buffer.
 * @param data Datos de entrada.
 * @returns Digest de 20 bytes.
 */
export function ripemd160(data: Buffer): Buffer {
  return createHash('ripemd160').update(data).digest();
}

/**
 * Calcula Hash160 = RIPEMD160(SHA256(x)).
 * Se emplea para derivar el hash de clave pública en direcciones legacy y en
 * los programas de testigo (witness) v0.
 * @param data Datos de entrada (típicamente una clave pública).
 * @returns Digest de 20 bytes.
 */
export function hash160(data: Buffer): Buffer {
  return ripemd160(sha256(data));
}

/**
 * Invierte el orden de los bytes de un buffer.
 * Bitcoin muestra los hashes en formato "big-endian" (invertido respecto al
 * orden interno "little-endian"), por lo que esta utilidad es necesaria para
 * convertir entre ambos al calcular la raíz de Merkle.
 * @param buffer Buffer a invertir.
 * @returns Nuevo buffer con los bytes en orden inverso.
 */
export function reverseBuffer(buffer: Buffer): Buffer {
  return Buffer.from(buffer).reverse();
}

/**
 * Calcula la raíz de Merkle de un bloque a partir de la lista ordenada de
 * txids (en formato hexadecimal big-endian, tal como los muestran los
 * exploradores).
 *
 * Algoritmo: se emparejan los hashes de dos en dos y se aplica doble SHA-256
 * a la concatenación; si el número de nodos es impar, el último se duplica.
 * El proceso se repite hasta obtener un único hash: la raíz.
 *
 * @param txids Lista de txids en hexadecimal big-endian.
 * @returns Raíz de Merkle en hexadecimal big-endian, o cadena vacía si no hay txids.
 */
export function merkleRoot(txids: string[]): string {
  if (txids.length === 0) {
    return '';
  }

  // Convertir a little-endian (orden interno) para el cálculo.
  let level: Buffer[] = txids.map((txid) => reverseBuffer(Buffer.from(txid, 'hex')));

  while (level.length > 1) {
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      // Si el número de nodos es impar, se duplica el último.
      const right = i + 1 < level.length ? level[i + 1] : left;
      nextLevel.push(hash256(Buffer.concat([left, right])));
    }
    level = nextLevel;
  }

  // Volver a big-endian para la representación de salida.
  return reverseBuffer(level[0]).toString('hex');
}
