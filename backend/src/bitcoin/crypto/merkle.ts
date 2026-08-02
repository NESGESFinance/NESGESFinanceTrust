/**
 * Árbol de Merkle: construcción de la raíz y de pruebas de inclusión.
 *
 * Además del cálculo de la raíz (reexportado desde `hash-utils`), este módulo
 * genera y verifica "merkle proofs" (rutas de autenticación), fundamentales
 * para las pruebas de inclusión SPV y para verificar que una transacción
 * pertenece a un bloque sin descargar el bloque completo.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import { hash256, reverseBuffer, merkleRoot } from './hash-utils';

export { merkleRoot };

/** Un paso de una prueba de Merkle: hash hermano y posición (izq/der). */
export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

/**
 * Genera la prueba de Merkle (ruta de autenticación) para el txid situado en
 * el índice indicado.
 * @param txids Lista ordenada de txids del bloque (hex big-endian).
 * @param index Índice de la transacción objetivo.
 * @returns Lista de pasos (hashes hermanos) desde la hoja hasta la raíz.
 */
export function buildMerkleProof(txids: string[], index: number): MerkleProofStep[] {
  if (index < 0 || index >= txids.length) {
    throw new Error(`Índice fuera de rango: ${index} (total ${txids.length}).`);
  }

  const proof: MerkleProofStep[] = [];
  let level: Buffer[] = txids.map((txid) => reverseBuffer(Buffer.from(txid, 'hex')));
  let idx = index;

  while (level.length > 1) {
    const isRightNode = idx % 2 === 1;
    const pairIndex = isRightNode ? idx - 1 : idx + 1;
    const siblingIndex = pairIndex < level.length ? pairIndex : idx; // Duplicado si es impar.

    proof.push({
      hash: reverseBuffer(level[siblingIndex]).toString('hex'),
      position: isRightNode ? 'left' : 'right',
    });

    // Construir el siguiente nivel.
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      nextLevel.push(hash256(Buffer.concat([left, right])));
    }
    level = nextLevel;
    idx = Math.floor(idx / 2);
  }

  return proof;
}

/**
 * Verifica una prueba de Merkle: recalcula la raíz a partir del txid y la ruta,
 * y la compara con la raíz esperada.
 * @param txid Transacción a verificar (hex big-endian).
 * @param proof Ruta de autenticación generada por `buildMerkleProof`.
 * @param expectedRoot Raíz de Merkle esperada (hex big-endian).
 * @returns `true` si la prueba es válida.
 */
export function verifyMerkleProof(txid: string, proof: MerkleProofStep[], expectedRoot: string): boolean {
  let current = reverseBuffer(Buffer.from(txid, 'hex'));

  for (const step of proof) {
    const sibling = reverseBuffer(Buffer.from(step.hash, 'hex'));
    const combined = step.position === 'left' ? Buffer.concat([sibling, current]) : Buffer.concat([current, sibling]);
    current = hash256(combined);
  }

  return reverseBuffer(current).toString('hex') === expectedRoot;
}
