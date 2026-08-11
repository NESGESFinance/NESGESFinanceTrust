/**
 * Pruebas unitarias para las utilidades de codificación de enteros variables.
 *
 * Cubre CompactSize (varint Bitcoin) y LEB128 sin signo (protocolo Runes).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import {
  encodeCompactSize,
  decodeCompactSize,
  encodeLEB128,
  decodeLEB128,
} from '../utils/varint';

/* ────────────────────────────────────────────────────────────────────────────
   CompactSize
   ──────────────────────────────────────────────────────────────────────────── */
describe('CompactSize', () => {
  describe('encodeCompactSize', () => {
    it('codifica un valor de 1 byte (< 0xFD)', () => {
      expect(encodeCompactSize(0)).toEqual(Buffer.from([0x00]));
      expect(encodeCompactSize(1)).toEqual(Buffer.from([0x01]));
      expect(encodeCompactSize(0xfc)).toEqual(Buffer.from([0xfc]));
    });

    it('codifica un valor de 3 bytes (0xFD–0xFFFF)', () => {
      const buf = encodeCompactSize(0xfd);
      expect(buf.length).toBe(3);
      expect(buf[0]).toBe(0xfd);
      expect(buf.readUInt16LE(1)).toBe(0xfd);
    });

    it('codifica un valor de 5 bytes (0x10000–0xFFFFFFFF)', () => {
      const buf = encodeCompactSize(0x10000);
      expect(buf.length).toBe(5);
      expect(buf[0]).toBe(0xfe);
      expect(buf.readUInt32LE(1)).toBe(0x10000);
    });

    it('codifica un valor de 9 bytes (> 0xFFFFFFFF)', () => {
      const bigVal = BigInt('0x100000000');
      const buf = encodeCompactSize(bigVal);
      expect(buf.length).toBe(9);
      expect(buf[0]).toBe(0xff);
    });

    it('lanza error para valores negativos', () => {
      expect(() => encodeCompactSize(-1)).toThrow();
    });

    it('acepta bigint como entrada', () => {
      expect(encodeCompactSize(0n)).toEqual(Buffer.from([0x00]));
      expect(encodeCompactSize(252n)).toEqual(Buffer.from([0xfc]));
    });
  });

  describe('decodeCompactSize', () => {
    it('decodifica un valor de 1 byte', () => {
      const result = decodeCompactSize(Buffer.from([0x42]));
      expect(result.value).toBe(0x42n);
      expect(result.bytesRead).toBe(1);
    });

    it('decodifica un valor de 3 bytes (prefijo 0xFD)', () => {
      const buf = encodeCompactSize(1000);
      const result = decodeCompactSize(buf);
      expect(result.value).toBe(1000n);
      expect(result.bytesRead).toBe(3);
    });

    it('decodifica un valor de 5 bytes (prefijo 0xFE)', () => {
      const buf = encodeCompactSize(0x10001);
      const result = decodeCompactSize(buf);
      expect(result.value).toBe(0x10001n);
      expect(result.bytesRead).toBe(5);
    });

    it('decodifica un valor de 9 bytes (prefijo 0xFF)', () => {
      const bigVal = BigInt('0x123456789');
      const buf = encodeCompactSize(bigVal);
      const result = decodeCompactSize(buf);
      expect(result.value).toBe(bigVal);
      expect(result.bytesRead).toBe(9);
    });

    it('ida y vuelta encode→decode para varios valores', () => {
      const values = [0, 1, 252, 253, 0xffff, 0x10000, 0xffffffff];
      for (const v of values) {
        const buf = encodeCompactSize(v);
        const { value } = decodeCompactSize(buf);
        expect(value).toBe(BigInt(v));
      }
    });

    it('respeta el parámetro offset', () => {
      // Prefijamos un byte 0x00 extra y leemos a partir del offset 1.
      const inner = encodeCompactSize(99);
      const buf = Buffer.concat([Buffer.from([0x00]), inner]);
      const result = decodeCompactSize(buf, 1);
      expect(result.value).toBe(99n);
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   LEB128 sin signo (Runes)
   ──────────────────────────────────────────────────────────────────────────── */
describe('LEB128', () => {
  describe('encodeLEB128', () => {
    it('codifica el cero en 1 byte', () => {
      expect(encodeLEB128(0n)).toEqual(Buffer.from([0x00]));
    });

    it('codifica valores de 1 byte (< 128)', () => {
      expect(encodeLEB128(1n)).toEqual(Buffer.from([0x01]));
      expect(encodeLEB128(127n)).toEqual(Buffer.from([0x7f]));
    });

    it('codifica valores de 2 bytes', () => {
      // 128 = 0x80 → [0x80, 0x01]
      expect(encodeLEB128(128n)).toEqual(Buffer.from([0x80, 0x01]));
      // 300 = 0x12c → [0xac, 0x02]
      expect(encodeLEB128(300n)).toEqual(Buffer.from([0xac, 0x02]));
    });

    it('codifica valores grandes', () => {
      const big = 2n ** 63n;
      const buf = encodeLEB128(big);
      // El buffer no debe estar vacío y debe terminar sin el bit de continuación.
      expect(buf.length).toBeGreaterThan(1);
      expect(buf[buf.length - 1] & 0x80).toBe(0);
    });

    it('lanza error para valores negativos', () => {
      expect(() => encodeLEB128(-1n)).toThrow();
    });
  });

  describe('decodeLEB128', () => {
    it('decodifica el cero', () => {
      const result = decodeLEB128(Buffer.from([0x00]));
      expect(result.value).toBe(0n);
      expect(result.bytesRead).toBe(1);
    });

    it('decodifica valores de 1 byte', () => {
      expect(decodeLEB128(Buffer.from([0x01])).value).toBe(1n);
      expect(decodeLEB128(Buffer.from([0x7f])).value).toBe(127n);
    });

    it('decodifica valores de 2 bytes', () => {
      const r = decodeLEB128(Buffer.from([0x80, 0x01]));
      expect(r.value).toBe(128n);
      expect(r.bytesRead).toBe(2);
    });

    it('ida y vuelta encode→decode', () => {
      const values = [0n, 1n, 127n, 128n, 300n, 16383n, 16384n, 2n ** 32n];
      for (const v of values) {
        const buf = encodeLEB128(v);
        const { value } = decodeLEB128(buf);
        expect(value).toBe(v);
      }
    });

    it('lanza error si el buffer está incompleto', () => {
      // Un byte con el bit de continuación activo pero sin byte siguiente.
      expect(() => decodeLEB128(Buffer.from([0x80]))).toThrow('incompleto');
    });

    it('respeta el parámetro offset', () => {
      const inner = encodeLEB128(42n);
      const buf = Buffer.concat([Buffer.from([0xff]), inner]);
      const result = decodeLEB128(buf, 1);
      expect(result.value).toBe(42n);
    });
  });
});
