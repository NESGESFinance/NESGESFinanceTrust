/**
 * Codificación y decodificación Base58 y Base58Check.
 *
 * Base58 es el alfabeto usado en Bitcoin para direcciones legacy y claves WIF.
 * Excluye caracteres ambiguos (0, O, I, l) y símbolos no alfanuméricos.
 * Base58Check añade un checksum de 4 bytes (primeros 4 bytes de doble SHA-256)
 * para detectar errores de transcripción.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import { sha256d } from './hash-utils';

/** Alfabeto estándar de Bitcoin para Base58. */
export const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = BigInt(ALPHABET.length);

/** Mapa inverso carácter → valor, precalculado para la decodificación. */
const ALPHABET_MAP: { [char: string]: number } = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET[i]] = i;
}

/**
 * Codifica un buffer en una cadena Base58.
 * @param data Datos binarios a codificar.
 * @returns Cadena Base58.
 */
export function encode(data: Buffer): string {
  if (data.length === 0) {
    return '';
  }

  // Convertir el buffer a un entero grande.
  let intVal = BigInt('0x' + (data.toString('hex') || '0'));

  let result = '';
  while (intVal > 0n) {
    const remainder = intVal % BASE;
    intVal = intVal / BASE;
    result = ALPHABET[Number(remainder)] + result;
  }

  // Cada byte 0x00 inicial se representa con el primer carácter del alfabeto.
  for (const byte of data) {
    if (byte === 0) {
      result = ALPHABET[0] + result;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Decodifica una cadena Base58 a su representación binaria.
 * @param str Cadena Base58.
 * @returns Buffer con los datos decodificados.
 * @throws Error si la cadena contiene caracteres no válidos.
 */
export function decode(str: string): Buffer {
  if (str.length === 0) {
    return Buffer.alloc(0);
  }

  let intVal = 0n;
  for (const char of str) {
    const value = ALPHABET_MAP[char];
    if (value === undefined) {
      throw new Error(`Carácter Base58 no válido: "${char}"`);
    }
    intVal = intVal * BASE + BigInt(value);
  }

  // Convertir el entero a bytes.
  let hex = intVal.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  let bytes = intVal === 0n ? [] : Array.from(Buffer.from(hex, 'hex'));

  // Restaurar los bytes 0x00 iniciales (representados por el primer carácter).
  for (const char of str) {
    if (char === ALPHABET[0]) {
      bytes = [0, ...bytes];
    } else {
      break;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Codifica un payload en Base58Check añadiendo un checksum de 4 bytes.
 * @param payload Datos a codificar (por ejemplo, versión + hash160).
 * @returns Cadena Base58Check.
 */
export function encodeCheck(payload: Buffer): string {
  const checksum = sha256d(payload).subarray(0, 4);
  return encode(Buffer.concat([payload, checksum]));
}

/**
 * Decodifica una cadena Base58Check y verifica su checksum.
 * @param str Cadena Base58Check.
 * @returns Payload sin el checksum.
 * @throws Error si el checksum no es válido.
 */
export function decodeCheck(str: string): Buffer {
  const decoded = decode(str);
  if (decoded.length < 4) {
    throw new Error('Cadena Base58Check demasiado corta para contener un checksum.');
  }
  const payload = decoded.subarray(0, decoded.length - 4);
  const checksum = decoded.subarray(decoded.length - 4);
  const expected = sha256d(payload).subarray(0, 4);

  if (!checksum.equals(expected)) {
    throw new Error('Checksum Base58Check no válido: la cadena está corrupta.');
  }
  return payload;
}
