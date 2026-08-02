/**
 * Interfaces del protocolo Runes (tokens fungibles sobre Bitcoin L1).
 *
 * Modelan las estructuras del RuneStone (grabado en un output OP_RETURN) y las
 * operaciones del protocolo: grabado (etch), acuñación (mint) y transferencia
 * (edict). Referencia: especificación de Casey Rodarmor, activada en el bloque
 * 840,000 (halving de 2024).
 *
 * En NESGESFinance los Runes se emplean como *Utility Tokens*.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/**
 * Identificador único de un Rune: bloque y posición de la transacción de
 * grabado dentro de ese bloque. Se representa como `bloque:tx`.
 */
export interface RuneId {
  block: number;
  tx: number;
}

/**
 * Términos de acuñación abierta (open mint) de un Rune.
 */
export interface RuneTerms {
  /** Cantidad acuñable por cada operación de mint. */
  amount: bigint;
  /** Número máximo de operaciones de mint permitidas (cap). */
  cap: bigint;
  /** Altura de bloque [inicio, fin] en que el mint está permitido. */
  heightStart: number | null;
  heightEnd: number | null;
  /** Offset de altura [inicio, fin] relativo al bloque de grabado. */
  offsetStart: number | null;
  offsetEnd: number | null;
}

/**
 * Operación de grabado (etching): crea un nuevo Rune.
 */
export interface RuneEtching {
  runeId: RuneId;
  /** Nombre del Rune (letras A-Z, con posibles "spacers"). */
  name: string;
  /** Símbolo (un único carácter Unicode). */
  symbol: string;
  /** Número de decimales (0-38). */
  divisibility: number;
  /** Cantidad pre-minada asignada al grabador. */
  premine: bigint;
  /** Términos de acuñación abierta (opcional). */
  terms: RuneTerms | null;
  /** Suministro total si es de emisión cerrada. */
  supply?: bigint;
}

/**
 * Operación de acuñación (mint) de un Rune ya existente.
 */
export interface RuneMint {
  runeId: RuneId;
  amount: bigint;
}

/**
 * Edicto de transferencia: mueve una cantidad de un Rune a un output.
 */
export interface RuneTransfer {
  runeId: RuneId;
  amount: bigint;
  /** Índice del output de destino (`output` en la especificación). */
  output: number;
  from?: string;
  to?: string;
}

/**
 * RuneStone completo decodificado de un output OP_RETURN (tag OP_13).
 */
export interface RuneStone {
  edicts: RuneTransfer[];
  etching: RuneEtching | null;
  mint: RuneId | null;
  /** Output por defecto para el resto de Runes no asignados. */
  pointer: number | null;
  /** Indica si el RuneStone es un cenotafio (malformado → quema los Runes). */
  cenotaph: boolean;
}

/**
 * Saldo de un Rune en poder de una dirección.
 */
export interface RuneHolder {
  address: string;
  amount: bigint;
  runeId: RuneId;
}

/**
 * Vista agregada de un token Rune (para la API pública).
 */
export interface RuneToken {
  runeId: RuneId;
  name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  totalSupply: bigint;
  circulatingSupply: bigint;
  mints: number;
  holders: number;
  etchedAtHeight: number;
  etchedAtTxid: string;
  timestamp: number;
}
