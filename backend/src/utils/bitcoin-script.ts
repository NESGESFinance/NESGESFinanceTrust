/**
 * Parsers de scripts Bitcoin (scriptSig / scriptPubKey) y utilidades de opcodes.
 *
 * Proporciona la tokenización de un script en sus opcodes y datos, la
 * extracción de outputs OP_RETURN (esenciales para Runes) y la detección de
 * inscripciones "envelope" de Ordinals en los datos de testigo.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/** Opcodes relevantes del lenguaje Script de Bitcoin. */
export const OPCODES = {
  OP_0: 0x00,
  OP_FALSE: 0x00,
  OP_PUSHDATA1: 0x4c,
  OP_PUSHDATA2: 0x4d,
  OP_PUSHDATA4: 0x4e,
  OP_1NEGATE: 0x4f,
  OP_1: 0x51,
  OP_16: 0x60,
  OP_RETURN: 0x6a,
  OP_DUP: 0x76,
  OP_EQUAL: 0x87,
  OP_EQUALVERIFY: 0x88,
  OP_HASH160: 0xa9,
  OP_CHECKSIG: 0xac,
  OP_IF: 0x63,
  OP_ENDIF: 0x68,
} as const;

/** Marcador mágico del protocolo Runes en OP_RETURN (OP_13). */
export const RUNESTONE_MAGIC = 0x5d; // OP_13 = 0x5d.

/** Un elemento del script: un opcode o un empuje de datos. */
export interface ScriptChunk {
  opcode: number;
  data: Buffer | null;
}

/**
 * Tokeniza un script en su secuencia de chunks (opcodes y datos).
 * @param script Script en formato binario.
 * @returns Lista de chunks.
 */
export function parseScript(script: Buffer): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  let i = 0;

  while (i < script.length) {
    const opcode = script[i];
    i++;

    if (opcode > OPCODES.OP_0 && opcode < OPCODES.OP_PUSHDATA1) {
      // Empuje directo de `opcode` bytes.
      chunks.push({ opcode, data: script.subarray(i, i + opcode) });
      i += opcode;
    } else if (opcode === OPCODES.OP_PUSHDATA1) {
      const len = script.readUInt8(i);
      i += 1;
      chunks.push({ opcode, data: script.subarray(i, i + len) });
      i += len;
    } else if (opcode === OPCODES.OP_PUSHDATA2) {
      const len = script.readUInt16LE(i);
      i += 2;
      chunks.push({ opcode, data: script.subarray(i, i + len) });
      i += len;
    } else if (opcode === OPCODES.OP_PUSHDATA4) {
      const len = script.readUInt32LE(i);
      i += 4;
      chunks.push({ opcode, data: script.subarray(i, i + len) });
      i += len;
    } else {
      // Opcode sin datos asociados.
      chunks.push({ opcode, data: null });
    }
  }

  return chunks;
}

/**
 * Indica si un scriptPubKey es un output OP_RETURN (dato no gastable).
 * @param scriptPubKey Script del output.
 */
export function isOpReturn(scriptPubKey: Buffer): boolean {
  return scriptPubKey.length > 0 && scriptPubKey[0] === OPCODES.OP_RETURN;
}

/**
 * Extrae el payload de datos de un output OP_RETURN, concatenando todos los
 * empujes de datos que siguen al opcode OP_RETURN.
 * @param scriptPubKey Script del output.
 * @returns Payload concatenado, o `null` si no es un OP_RETURN.
 */
export function extractOpReturnData(scriptPubKey: Buffer): Buffer | null {
  if (!isOpReturn(scriptPubKey)) {
    return null;
  }
  const chunks = parseScript(scriptPubKey.subarray(1));
  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    if (chunk.data) {
      parts.push(chunk.data);
    }
  }
  return Buffer.concat(parts);
}

/**
 * Parser de plantilla del creador DATUM (pool OCEAN).
 * Extrae los nombres de minero embebidos en el scriptSig de la coinbase.
 * @param coinbaseRaw scriptSig de la coinbase en hexadecimal.
 * @returns Lista de nombres de minero detectados.
 */
export function parseDATUMTemplateCreator(coinbaseRaw: string): string[] {
  try {
    const buf = Buffer.from(coinbaseRaw, 'hex');
    const ascii = buf.toString('utf8').replace(/[^\x20-\x7e]/g, ' ');
    const match = ascii.match(/DATUM[^\s]*\s+([\w.\-@]+)/);
    return match ? [match[1]] : [];
  } catch {
    return [];
  }
}

/**
 * Parser de plantilla del creador DMND (pool Demand/DMND).
 * @param coinbaseRaw scriptSig de la coinbase en hexadecimal.
 * @returns Lista de nombres de minero detectados.
 */
export function parseDMNDTemplateCreator(coinbaseRaw: string): string[] {
  try {
    const buf = Buffer.from(coinbaseRaw, 'hex');
    const ascii = buf.toString('utf8').replace(/[^\x20-\x7e]/g, ' ');
    const match = ascii.match(/DMND\s+([\w.\-@]+)/);
    return match ? [match[1]] : [];
  } catch {
    return [];
  }
}
