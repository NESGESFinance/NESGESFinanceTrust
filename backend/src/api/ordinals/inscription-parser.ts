/**
 * Parser de inscripciones Ordinals ("envelopes" en datos de testigo).
 *
 * Una inscripción se incrusta en el witness de un input Taproot mediante un
 * "envelope" con la forma:
 *
 *   OP_FALSE OP_IF
 *     OP_PUSH "ord"
 *     OP_PUSH 0x01 OP_PUSH <content-type>
 *     OP_PUSH 0x00 (marcador de cuerpo)
 *     <empujes de datos del cuerpo...>
 *   OP_ENDIF
 *
 * Este módulo extrae el tipo de contenido y el cuerpo binario de todas las
 * inscripciones presentes en un script de testigo.
 *
 * En NESGESFinance los Ordinals se emplean como *Security Tokens* y como
 * contenedor de metadatos de los Activos del Mundo Real (RWA).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { OPCODES, ScriptChunk, parseScript } from '../../utils/bitcoin-script';
import { InscriptionContent } from '../../interfaces/ordinals.interfaces';

/** Protocolo de identificación de inscripciones: la cadena ASCII "ord". */
const ORD_PROTOCOL_ID = Buffer.from('ord', 'ascii');

/** Tags conocidos dentro del envelope de una inscripción. */
enum InscriptionTag {
  ContentType = 0x01,
  Body = 0x00,
}

/**
 * Extrae todas las inscripciones de un script de testigo (tapscript).
 * @param witnessScript Script de testigo en binario (la "reveal script").
 * @returns Lista de inscripciones encontradas.
 */
export function parseInscriptions(witnessScript: Buffer): InscriptionContent[] {
  const chunks = parseScript(witnessScript);
  const inscriptions: InscriptionContent[] = [];

  for (let i = 0; i < chunks.length; i++) {
    // Se busca la secuencia OP_FALSE (OP_0) OP_IF que abre un envelope.
    if (chunks[i].opcode === OPCODES.OP_0 && i + 1 < chunks.length && chunks[i + 1].opcode === OPCODES.OP_IF) {
      const parsed = parseEnvelope(chunks, i + 2);
      if (parsed.inscription) {
        inscriptions.push(parsed.inscription);
      }
      i = parsed.nextIndex;
    }
  }

  return inscriptions;
}

/**
 * Parsea un envelope a partir del índice indicado (justo después de OP_IF).
 * @param chunks Chunks del script.
 * @param startIndex Índice del primer chunk tras OP_IF.
 * @returns Inscripción decodificada (o `null`) y el índice de continuación.
 */
function parseEnvelope(
  chunks: ScriptChunk[],
  startIndex: number,
): { inscription: InscriptionContent | null; nextIndex: number } {
  let i = startIndex;

  // El primer empuje debe ser el identificador de protocolo "ord".
  if (i >= chunks.length || !chunks[i].data || !chunks[i].data!.equals(ORD_PROTOCOL_ID)) {
    return { inscription: null, nextIndex: i };
  }
  i++;

  let contentType = 'application/octet-stream';
  const bodyParts: Buffer[] = [];
  let inBody = false;

  while (i < chunks.length && chunks[i].opcode !== OPCODES.OP_ENDIF) {
    const chunk = chunks[i];

    if (inBody) {
      if (chunk.data) {
        bodyParts.push(chunk.data);
      }
      i++;
      continue;
    }

    // Los tags son empujes de un solo byte (0x01 = content-type, 0x00 = body).
    if (chunk.data && chunk.data.length === 1) {
      const tag = chunk.data[0];
      if (tag === InscriptionTag.ContentType && i + 1 < chunks.length && chunks[i + 1].data) {
        contentType = chunks[i + 1].data!.toString('utf8');
        i += 2;
        continue;
      }
      if (tag === InscriptionTag.Body) {
        inBody = true;
        i++;
        continue;
      }
    }
    // Tag desconocido: se salta junto a su posible valor.
    i += chunk.data ? 2 : 1;
  }

  const inscription: InscriptionContent = {
    contentType,
    body: Buffer.concat(bodyParts),
  };
  return { inscription, nextIndex: i };
}

/**
 * Construye el identificador de inscripción `<txid>i<index>`.
 * @param txid Txid de la transacción de génesis.
 * @param index Índice de la inscripción dentro de la transacción.
 */
export function buildInscriptionId(txid: string, index: number): string {
  return `${txid}i${index}`;
}
