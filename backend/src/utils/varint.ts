/**
 * Codificación de enteros de longitud variable.
 *
 * Incluye dos esquemas:
 *   1. `CompactSize` (a.k.a. "varint" de Bitcoin): usado en la serialización de
 *      transacciones y bloques para prefijos de longitud.
 *   2. `LEB128` sin signo: usado por el protocolo Runes para codificar los
 *      enteros dentro del RuneStone.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/** Resultado de una decodificación: valor leído y número de bytes consumidos. */
export interface VarIntReadResult {
  value: bigint;
  bytesRead: number;
}

/* -------------------------------------------------------------------------- */
/*  CompactSize (varint de Bitcoin)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Codifica un número en formato CompactSize de Bitcoin.
 * @param value Valor no negativo a codificar.
 * @returns Buffer con la representación CompactSize.
 */
export function encodeCompactSize(value: number | bigint): Buffer {
  const n = BigInt(value);
  if (n < 0n) {
    throw new Error('CompactSize no admite valores negativos.');
  }
  if (n < 0xfdn) {
    return Buffer.from([Number(n)]);
  } else if (n <= 0xffffn) {
    const buf = Buffer.alloc(3);
    buf.writeUInt8(0xfd, 0);
    buf.writeUInt16LE(Number(n), 1);
    return buf;
  } else if (n <= 0xffffffffn) {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0xfe, 0);
    buf.writeUInt32LE(Number(n), 1);
    return buf;
  } else {
    const buf = Buffer.alloc(9);
    buf.writeUInt8(0xff, 0);
    buf.writeBigUInt64LE(n, 1);
    return buf;
  }
}

/**
 * Decodifica un CompactSize de Bitcoin.
 * @param buffer Buffer de origen.
 * @param offset Posición inicial de lectura.
 * @returns Valor decodificado y bytes consumidos.
 */
export function decodeCompactSize(buffer: Buffer, offset = 0): VarIntReadResult {
  const first = buffer.readUInt8(offset);
  if (first < 0xfd) {
    return { value: BigInt(first), bytesRead: 1 };
  } else if (first === 0xfd) {
    return { value: BigInt(buffer.readUInt16LE(offset + 1)), bytesRead: 3 };
  } else if (first === 0xfe) {
    return { value: BigInt(buffer.readUInt32LE(offset + 1)), bytesRead: 5 };
  } else {
    return { value: buffer.readBigUInt64LE(offset + 1), bytesRead: 9 };
  }
}

/* -------------------------------------------------------------------------- */
/*  LEB128 sin signo (protocolo Runes)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Codifica un entero en LEB128 sin signo (usado por el protocolo Runes).
 * @param value Valor no negativo.
 * @returns Buffer LEB128.
 */
export function encodeLEB128(value: bigint): Buffer {
  if (value < 0n) {
    throw new Error('LEB128 sin signo no admite valores negativos.');
  }
  const bytes: number[] = [];
  let n = value;
  do {
    let byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n !== 0n) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (n !== 0n);
  return Buffer.from(bytes);
}

/**
 * Decodifica un entero LEB128 sin signo.
 * @param buffer Buffer de origen.
 * @param offset Posición inicial de lectura.
 * @returns Valor decodificado y bytes consumidos.
 */
export function decodeLEB128(buffer: Buffer, offset = 0): VarIntReadResult {
  let result = 0n;
  let shift = 0n;
  let bytesRead = 0;

  while (offset + bytesRead < buffer.length) {
    const byte = buffer.readUInt8(offset + bytesRead);
    result |= BigInt(byte & 0x7f) << shift;
    bytesRead++;
    if ((byte & 0x80) === 0) {
      return { value: result, bytesRead };
    }
    shift += 7n;
    if (shift > 128n) {
      throw new Error('LEB128 sobrepasa el rango de 128 bits (dato corrupto).');
    }
  }
  throw new Error('LEB128 incompleto: se alcanzó el final del buffer.');
}
