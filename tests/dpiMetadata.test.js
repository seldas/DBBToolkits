import { describe, expect, it } from 'vitest';
import {
    changeJpegDpi,
    changePngDpi,
    crc32,
    getJpegDpi,
    getPngDpi,
    stripJpegMetadata,
    stripPngMetadata,
} from '../src/figure/dpiMetadata.js';

function makePngChunk(type, dataBytes) {
    const len = dataBytes.length;
    const buf = new Uint8Array(12 + len);
    const view = new DataView(buf.buffer);
    view.setUint32(0, len);
    for (let i = 0; i < 4; i++) buf[4 + i] = type.charCodeAt(i);
    buf.set(dataBytes, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    view.setUint32(8 + len, crc);
    return buf;
}

function makeMinimalPng({ withTextChunk = false } = {}) {
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = makePngChunk('IHDR', new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]));
    const text = withTextChunk
        ? makePngChunk('tEXt', new TextEncoder().encode('Author\0Alice'))
        : new Uint8Array(0);
    const idat = makePngChunk('IDAT', new Uint8Array([120, 156, 99, 0, 0, 0, 2, 0, 1]));
    const iend = makePngChunk('IEND', new Uint8Array(0));

    const out = new Uint8Array(sig.length + ihdr.length + text.length + idat.length + iend.length);
    let offset = 0;
    for (const part of [sig, ihdr, text, idat, iend]) {
        out.set(part, offset);
        offset += part.length;
    }
    return out.buffer;
}

function makeMinimalJpeg({ withExif = false } = {}) {
    // SOI + APP0(JFIF 72dpi) + [APP1(Exif)] + SOS + EOI
    const soi = [0xFF, 0xD8];
    const app0 = [
        0xFF, 0xE0, 0x00, 0x10,
        0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
        0x01, 0x01, 0x01,             // version 1.1, units=1 (dpi)
        0x00, 0x48, 0x00, 0x48,       // 72 x 72
        0x00, 0x00,
    ];
    const app1 = withExif
        ? [0xFF, 0xE1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
        : [];
    const sosAndEoi = [0xFF, 0xDA, 0x00, 0x04, 0x00, 0x00, 0xFF, 0xD9];
    return new Uint8Array([...soi, ...app0, ...app1, ...sosAndEoi]).buffer;
}

describe('dpiMetadata', () => {
    it('computes standard CRC32', () => {
        const bytes = new TextEncoder().encode('IEND');
        expect(crc32(bytes)).toBe(0xAE426082);
    });

    it('inserts and updates PNG pHYs DPI losslessly', () => {
        const png = makeMinimalPng();
        expect(getPngDpi(png)).toBeNull();

        const png300 = changePngDpi(png, 300);
        expect(getPngDpi(png300)).toBe(300);

        const png600 = changePngDpi(png300, 600);
        expect(getPngDpi(png600)).toBe(600);
    });

    it('strips sensitive PNG metadata chunks while preserving DPI', () => {
        const png = changePngDpi(makeMinimalPng({ withTextChunk: true }), 300);
        const { buffer, stripped } = stripPngMetadata(png);
        expect(stripped.length).toBe(1);
        expect(stripped[0].type).toBe('PNG tEXt');
        expect(stripped[0].detail).toContain('Author');
        expect(getPngDpi(buffer)).toBe(300);
    });

    it('reads and updates JPEG JFIF DPI and strips APP1 Exif', () => {
        const jpg = makeMinimalJpeg({ withExif: true });
        expect(getJpegDpi(jpg)).toBe(72);

        const jpg300 = changeJpegDpi(jpg, 300);
        expect(getJpegDpi(jpg300)).toBe(300);

        const { buffer: cleanJpg, stripped } = stripJpegMetadata(jpg300);
        expect(stripped.some((s) => s.type.includes('EXIF'))).toBe(true);
        expect(getJpegDpi(cleanJpg)).toBe(300);
    });

    it('inserts JFIF APP0 when JPEG lacks one', () => {
        const bareJpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x04, 0x00, 0x00, 0xFF, 0xD9]).buffer;
        expect(getJpegDpi(bareJpg)).toBeNull();
        const jpg600 = changeJpegDpi(bareJpg, 600);
        expect(getJpegDpi(jpg600)).toBe(600);
    });
});
