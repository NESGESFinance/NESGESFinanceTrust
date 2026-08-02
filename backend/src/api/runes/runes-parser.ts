/**
 * Decodificador de RuneStones del protocolo Runes.
 *
 * Un RuneStone se graba en un único output OP_RETURN cuyo primer empuje de
 * datos es el marcador mágico OP_13 (0x5d). El payload restante es una
 * secuencia de enteros LEB128 sin signo organizados en pares `tag, valor` y,
 * al final, el "cuerpo" de edictos precedido por el tag `Body` (0).
 *
 * Referencia: especificación de Runes de Casey Rodarmor (activación en el
 * bloque 840,000, halving de abril de 2024). En NESGESFinance los Runes se
 * emplean como *Utility Tokens*.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { decodeLEB128 } from '../../utils/varint';
import { OPCODES, RUNESTONE_MAGIC, parseScript } from '../../utils/bitcoin-script';
import {
  RuneEtching,
  RuneId,
  RuneStone,
  RuneTerms,
  RuneTransfer,
} from '../../interfaces/runes.interfaces';

/**
 * Tags del RuneStone según la especificación. Los tags pares deben interpretar
 * un único valor; los impares pueden repetirse. El tag `Body` (0) marca el
 * inicio de los edictos.
 */
enum RuneTag {
  Body = 0,
  Flags = 2,
  Rune = 4,
  Premine = 6,
  Cap = 8,
  Amount = 10,
  HeightStart = 12,
  HeightEnd = 14,
  OffsetStart = 16,
  OffsetEnd = 18,
  Mint = 20,
  Pointer = 22,
  Divisibility = 1,
  Spacers = 3,
  Symbol = 5,
  Nop = 127,
}

/** Máscaras de bits del campo `Flags`. */
enum RuneFlag {
  Etching = 0,
  Terms = 1,
  Turbo = 2,
  Cenotaph = 127,
}

/** Alfabeto base-26 (A-Z) usado para codificar el nombre modificado del Rune. */
const RUNE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Comprueba si un scriptPubKey es un RuneStone (OP_RETURN + OP_13).
 * @param scriptPubKey Script del output en binario.
 */
export function isRunestone(scriptPubKey: Buffer): boolean {
  if (scriptPubKey.length < 2 || scriptPubKey[0] !== OPCODES.OP_RETURN) {
    return false;
  }
  return scriptPubKey[1] === RUNESTONE_MAGIC;
}

/**
 * Extrae el payload binario de un RuneStone (concatena los empujes de datos
 * posteriores al marcador mágico).
 * @param scriptPubKey Script del output OP_RETURN.
 * @returns Payload concatenado o `null` si no es un RuneStone.
 */
export function extractRunestonePayload(scriptPubKey: Buffer): Buffer | null {
  if (!isRunestone(scriptPubKey)) {
    return null;
  }
  // Se omiten OP_RETURN (1 byte) y el marcador mágico OP_13 (1 byte).
  const chunks = parseScript(scriptPubKey.subarray(2));
  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    if (chunk.data) {
      parts.push(chunk.data);
    }
  }
  return Buffer.concat(parts);
}

/**
 * Lee la secuencia completa de enteros LEB128 de un payload.
 * @param payload Payload binario del RuneStone.
 * @returns Lista de enteros decodificados.
 */
function readIntegers(payload: Buffer): bigint[] {
  const integers: bigint[] = [];
  let offset = 0;
  while (offset < payload.length) {
    const { value, bytesRead } = decodeLEB128(payload, offset);
    integers.push(value);
    offset += bytesRead;
  }
  return integers;
}

/**
 * Convierte el entero modificado del nombre de un Rune a su representación en
 * base-26 (A-Z), según la especificación.
 * @param value Entero del nombre.
 * @returns Nombre en texto.
 */
export function decodeRuneName(value: bigint): string {
  let n = value + 1n;
  let name = '';
  while (n > 0n) {
    n -= 1n;
    const index = Number(n % 26n);
    name = RUNE_ALPHABET[index] + name;
    n /= 26n;
  }
  return name;
}

/**
 * Aplica los "spacers" (separadores tipográficos •) al nombre del Rune.
 * @param name Nombre base sin espaciadores.
 * @param spacers Máscara de bits de posiciones de espaciador.
 * @returns Nombre con espaciadores.
 */
export function applySpacers(name: string, spacers: number): string {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    result += name[i];
    if (i < name.length - 1 && (spacers & (1 << i)) !== 0) {
      result += '•';
    }
  }
  return result;
}

/** Comprueba si un bit de flag está activo. */
function hasFlag(flags: bigint, flag: RuneFlag): boolean {
  return (flags & (1n << BigInt(flag))) !== 0n;
}

/**
 * Decodifica un RuneStone completo a partir del scriptPubKey de un output
 * OP_RETURN. Devuelve `null` si el output no contiene un RuneStone.
 *
 * @param scriptPubKey Script del output.
 * @param runestoneBlock Altura del bloque de la transacción (para el RuneId de
 *                        un grabado, cuyo bloque es el de la propia tx).
 * @param runestoneTxIndex Índice de la tx dentro del bloque.
 * @returns RuneStone decodificado o `null`.
 */
export function decodeRunestone(
  scriptPubKey: Buffer,
  runestoneBlock: number,
  runestoneTxIndex: number,
): RuneStone | null {
  const payload = extractRunestonePayload(scriptPubKey);
  if (payload === null) {
    return null;
  }

  let integers: bigint[];
  try {
    integers = readIntegers(payload);
  } catch {
    // Payload corrupto → cenotafio (los Runes de entrada se queman).
    return emptyCenotaph();
  }

  const fields = new Map<bigint, bigint[]>();
  const edicts: RuneTransfer[] = [];
  let i = 0;
  let inBody = false;

  while (i < integers.length) {
    const tag = integers[i];
    if (tag === BigInt(RuneTag.Body)) {
      inBody = true;
      i += 1;
      break;
    }
    if (i + 1 >= integers.length) {
      // Tag sin valor → RuneStone malformado.
      return emptyCenotaph();
    }
    const value = integers[i + 1];
    const list = fields.get(tag) ?? [];
    list.push(value);
    fields.set(tag, list);
    i += 2;
  }

  // Decodificación de los edictos del cuerpo (grupos de 4 enteros con delta).
  if (inBody) {
    let lastBlock = 0n;
    let lastTx = 0n;
    while (i + 3 < integers.length + 1 && i + 3 <= integers.length) {
      const blockDelta = integers[i];
      const txValue = integers[i + 1];
      const amount = integers[i + 2];
      const output = integers[i + 3];
      i += 4;

      if (blockDelta === 0n) {
        lastTx += txValue;
      } else {
        lastBlock += blockDelta;
        lastTx = txValue;
      }
      edicts.push({
        runeId: { block: Number(lastBlock), tx: Number(lastTx) },
        amount,
        output: Number(output),
      });
    }
  }

  const flags = first(fields, RuneTag.Flags) ?? 0n;
  const cenotaph = hasFlag(flags, RuneFlag.Cenotaph);

  const etching = buildEtching(fields, flags, runestoneBlock, runestoneTxIndex);
  const mint = buildMint(fields);
  const pointerRaw = first(fields, RuneTag.Pointer);

  return {
    edicts,
    etching,
    mint,
    pointer: pointerRaw !== undefined ? Number(pointerRaw) : null,
    cenotaph,
  };
}

/** Devuelve el primer valor de un tag, o `undefined`. */
function first(fields: Map<bigint, bigint[]>, tag: RuneTag): bigint | undefined {
  const list = fields.get(BigInt(tag));
  return list && list.length > 0 ? list[0] : undefined;
}

/** Construye el grabado (etching) si el flag `Etching` está presente. */
function buildEtching(
  fields: Map<bigint, bigint[]>,
  flags: bigint,
  block: number,
  txIndex: number,
): RuneEtching | null {
  if (!hasFlag(flags, RuneFlag.Etching)) {
    return null;
  }

  const runeValue = first(fields, RuneTag.Rune);
  const spacers = first(fields, RuneTag.Spacers);
  const baseName = runeValue !== undefined ? decodeRuneName(runeValue) : 'UNCOMMONGOODS';
  const name = spacers !== undefined ? applySpacers(baseName, Number(spacers)) : baseName;

  const symbolCode = first(fields, RuneTag.Symbol);
  const symbol = symbolCode !== undefined ? String.fromCodePoint(Number(symbolCode)) : '¤';

  const divisibility = Number(first(fields, RuneTag.Divisibility) ?? 0n);
  const premine = first(fields, RuneTag.Premine) ?? 0n;

  let terms: RuneTerms | null = null;
  if (hasFlag(flags, RuneFlag.Terms)) {
    const heightStart = first(fields, RuneTag.HeightStart);
    const heightEnd = first(fields, RuneTag.HeightEnd);
    const offsetStart = first(fields, RuneTag.OffsetStart);
    const offsetEnd = first(fields, RuneTag.OffsetEnd);
    terms = {
      amount: first(fields, RuneTag.Amount) ?? 0n,
      cap: first(fields, RuneTag.Cap) ?? 0n,
      heightStart: heightStart !== undefined ? Number(heightStart) : null,
      heightEnd: heightEnd !== undefined ? Number(heightEnd) : null,
      offsetStart: offsetStart !== undefined ? Number(offsetStart) : null,
      offsetEnd: offsetEnd !== undefined ? Number(offsetEnd) : null,
    };
  }

  const runeId: RuneId = { block, tx: txIndex };
  return { runeId, name, symbol, divisibility, premine, terms };
}

/** Construye la referencia de mint (RuneId a acuñar) si está presente. */
function buildMint(fields: Map<bigint, bigint[]>): RuneId | null {
  const mint = fields.get(BigInt(RuneTag.Mint));
  if (!mint || mint.length < 2) {
    return null;
  }
  return { block: Number(mint[0]), tx: Number(mint[1]) };
}

/** RuneStone vacío marcado como cenotafio (quema los Runes de entrada). */
function emptyCenotaph(): RuneStone {
  return { edicts: [], etching: null, mint: null, pointer: null, cenotaph: true };
}
