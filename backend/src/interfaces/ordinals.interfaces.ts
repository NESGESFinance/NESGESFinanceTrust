/**
 * Interfaces del protocolo Ordinals (inscripciones sobre satoshis).
 *
 * La "Ordinal Theory" numera cada satoshi según el orden en que fue minado,
 * permitiendo rastrear satoshis individuales a través de los UTXOs. Las
 * "inscriptions" adjuntan contenido arbitrario (imagen, texto, JSON…) a un
 * satoshi concreto, incrustándolo en los datos de testigo (witness) de una
 * transacción Taproot.
 *
 * En NESGESFinance los Ordinals se emplean como *Security Tokens* y como
 * contenedor de los metadatos de los Activos del Mundo Real (RWA).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/**
 * Punto de satoshi (SatPoint): localiza un satoshi dentro de un UTXO como
 * `txid:vout:offset`, donde `offset` es la posición del satoshi dentro del
 * output.
 */
export interface SatPoint {
  txid: string;
  vout: number;
  offset: bigint;
}

/**
 * Rango de números ordinales `[start, end)` asignado a un output.
 */
export interface OrdinalRange {
  start: bigint;
  end: bigint;
}

/**
 * Contenido crudo de una inscripción.
 */
export interface InscriptionContent {
  contentType: string;
  body: Buffer;
}

/**
 * Metadatos completos de una inscripción Ordinal.
 */
export interface Inscription {
  /** Identificador de la inscripción: `<txid>i<index>`. */
  id: string;
  /** Número secuencial de inscripción asignado por el indexador. */
  number: number;
  /** Dirección actual que controla el satoshi inscrito. */
  address: string | null;
  /** Dirección en el momento de la génesis (creación). */
  genesisAddress: string | null;
  /** Tipo MIME del contenido (p. ej. `image/png`, `text/plain`). */
  contentType: string;
  /** Longitud del contenido en bytes. */
  contentLength: number;
  /** Ubicación actual del satoshi inscrito. */
  satPoint: SatPoint;
  /** Timestamp del bloque de génesis. */
  timestamp: number;
  /** Altura del bloque de génesis. */
  genesisHeight: number;
  /** Txid de la transacción de génesis. */
  genesisTxid: string;
  /** Número ordinal del satoshi inscrito (opcional si no se rastrea). */
  sat?: bigint;
}
