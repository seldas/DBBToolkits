/**
 * Shared PNG/JPEG binary DPI, metadata stripping, auto-crop, and SVG rasterization utilities.
 */

const PNG_SENSITIVE_CHUNKS = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']);

let crcTable = null;
function getCrcTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[i] = c >>> 0;
    }
    return crcTable;
}

export function crc32(buf) {
    const table = getCrcTable();
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getAscii(view, offset, length) {
    let s = '';
    for (let i = 0; i < length; i++) {
        s += String.fromCharCode(view.getUint8(offset + i));
    }
    return s;
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getPngDpi(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength < 8) return null;
    let offset = 8;

    while (offset + 12 <= view.byteLength) {
        const length = view.getUint32(offset);
        const chunkType = getAscii(view, offset + 4, 4);
        if (chunkType === 'pHYs' && length >= 9) {
            const xPixelsPerMeter = view.getUint32(offset + 8);
            const unit = view.getUint8(offset + 16);
            if (unit === 1) {
                return Math.round(xPixelsPerMeter * 0.0254);
            }
        }
        offset += 12 + length;
    }
    return null;
}

export function changePngDpi(buffer, targetDpi) {
    const view = new DataView(buffer);
    const pixelsPerMeter = Math.round(targetDpi / 0.0254);

    let offset = 8;
    let physOffset = -1;
    let idatOffset = -1;

    while (offset + 12 <= view.byteLength) {
        const length = view.getUint32(offset);
        const chunkType = getAscii(view, offset + 4, 4);
        if (chunkType === 'pHYs') {
            physOffset = offset;
            break;
        }
        if (chunkType === 'IDAT') {
            idatOffset = offset;
            break;
        }
        offset += 12 + length;
    }

    if (physOffset !== -1) {
        const newBuffer = buffer.slice(0);
        const destView = new DataView(newBuffer);
        destView.setUint32(physOffset + 8, pixelsPerMeter);
        destView.setUint32(physOffset + 12, pixelsPerMeter);
        destView.setUint8(physOffset + 16, 1);

        const crcVal = crc32(new Uint8Array(newBuffer, physOffset + 4, 13));
        destView.setUint32(physOffset + 17, crcVal);
        return newBuffer;
    }

    const insertPoint = idatOffset !== -1 ? idatOffset : 33;
    const chunkLength = 9;
    const totalChunkSize = 12 + chunkLength;
    const newBuffer = new ArrayBuffer(buffer.byteLength + totalChunkSize);
    const destView = new DataView(newBuffer);
    const srcArr = new Uint8Array(buffer);
    const destArr = new Uint8Array(newBuffer);

    destArr.set(srcArr.subarray(0, insertPoint), 0);
    destView.setUint32(insertPoint, chunkLength);
    destView.setUint8(insertPoint + 4, 112); // p
    destView.setUint8(insertPoint + 5, 72);  // H
    destView.setUint8(insertPoint + 6, 89);  // Y -> note: 89 is 'Y'!
    destView.setUint8(insertPoint + 7, 115); // s
    destView.setUint32(insertPoint + 8, pixelsPerMeter);
    destView.setUint32(insertPoint + 12, pixelsPerMeter);
    destView.setUint8(insertPoint + 16, 1);

    const crcVal = crc32(new Uint8Array(newBuffer, insertPoint + 4, 13));
    destView.setUint32(insertPoint + 17, crcVal);

    destArr.set(srcArr.subarray(insertPoint), insertPoint + totalChunkSize);
    return newBuffer;
}

export function stripPngMetadata(buffer) {
    const view = new DataView(buffer);
    const src = new Uint8Array(buffer);
    const keptChunks = [src.subarray(0, 8)];
    const stripped = [];

    let offset = 8;
    while (offset + 12 <= view.byteLength) {
        const length = view.getUint32(offset);
        const total = 12 + length;
        if (offset + total > view.byteLength) break;

        const chunkType = getAscii(view, offset + 4, 4);
        if (PNG_SENSITIVE_CHUNKS.has(chunkType)) {
            let detail = `${length} bytes`;
            if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
                const keyLen = Math.min(length, 40);
                const rawKey = getAscii(view, offset + 8, keyLen).split('\0')[0];
                if (rawKey) detail = `key "${rawKey}" (${length} bytes)`;
            }
            stripped.push({ type: `PNG ${chunkType}`, detail });
        } else {
            keptChunks.push(src.subarray(offset, offset + total));
        }
        offset += total;
    }

    const totalLen = keptChunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of keptChunks) {
        out.set(chunk, pos);
        pos += chunk.length;
    }
    return { buffer: out.buffer, stripped };
}

export function getJpegDpi(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFDA || marker === 0xFFD9) break;
        if ((marker & 0xFF00) !== 0xFF00) break;

        const length = view.getUint16(offset + 2);
        if (marker === 0xFFE0 && length >= 14) {
            const identifier = getAscii(view, offset + 4, 5);
            if (identifier === 'JFIF\0') {
                const units = view.getUint8(offset + 11);
                if (units === 1 || units === 2) {
                    const xDPI = view.getUint16(offset + 12);
                    return units === 1 ? xDPI : Math.round(xDPI * 2.54);
                }
            }
        }
        offset += 2 + length;
    }
    return null;
}

export function changeJpegDpi(buffer, targetDpi) {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
        throw new Error('Not a valid JPEG.');
    }

    let offset = 2;
    let app0Offset = -1;

    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFDA || marker === 0xFFD9) break;
        if ((marker & 0xFF00) !== 0xFF00) break;

        const length = view.getUint16(offset + 2);
        if (marker === 0xFFE0 && length >= 14) {
            const identifier = getAscii(view, offset + 4, 5);
            if (identifier === 'JFIF\0') {
                app0Offset = offset;
                break;
            }
        }
        offset += 2 + length;
    }

    if (app0Offset !== -1) {
        const newBuffer = buffer.slice(0);
        const destView = new DataView(newBuffer);
        destView.setUint8(app0Offset + 11, 1);
        destView.setUint16(app0Offset + 12, targetDpi);
        destView.setUint16(app0Offset + 14, targetDpi);
        return newBuffer;
    }

    const app0SegmentSize = 18;
    const newBuffer = new ArrayBuffer(buffer.byteLength + app0SegmentSize);
    const destView = new DataView(newBuffer);
    const srcArr = new Uint8Array(buffer);
    const destArr = new Uint8Array(newBuffer);

    destArr.set(srcArr.subarray(0, 2), 0);
    destView.setUint16(2, 0xFFE0);
    destView.setUint16(4, 16);
    destView.setUint8(6, 74);   // J
    destView.setUint8(7, 70);   // F
    destView.setUint8(8, 73);   // I
    destView.setUint8(9, 70);   // F
    destView.setUint8(10, 0);   // \0
    destView.setUint8(11, 1);   // version major
    destView.setUint8(12, 1);   // version minor
    destView.setUint8(13, 1);   // units = DPI
    destView.setUint16(14, targetDpi);
    destView.setUint16(16, targetDpi);
    destView.setUint8(18, 0);   // Xthumbnail
    destView.setUint8(19, 0);   // Ythumbnail
    destArr.set(srcArr.subarray(2), 20);

    return newBuffer;
}

export function stripJpegMetadata(buffer) {
    const view = new DataView(buffer);
    const src = new Uint8Array(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
        return { buffer, stripped: [] };
    }

    const kept = [src.subarray(0, 2)];
    const stripped = [];
    let offset = 2;

    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFDA) {
            kept.push(src.subarray(offset));
            offset = view.byteLength;
            break;
        }
        if (marker === 0xFFD9) {
            kept.push(src.subarray(offset, offset + 2));
            offset += 2;
            break;
        }
        if ((marker & 0xFF00) !== 0xFF00) {
            kept.push(src.subarray(offset));
            break;
        }

        const length = view.getUint16(offset + 2);
        const total = 2 + length;
        if (offset + total > view.byteLength) {
            kept.push(src.subarray(offset));
            break;
        }

        const isAppMarker = marker >= 0xFFE1 && marker <= 0xFFEF && marker !== 0xFFEE;
        const isComment = marker === 0xFFFE;

        if (isAppMarker || isComment) {
            const label = marker === 0xFFE1
                ? (getAscii(view, offset + 4, 4) === 'Exif' ? 'EXIF (APP1)' : 'XMP/APP1')
                : marker === 0xFFFE
                    ? 'JPEG Comment (COM)'
                    : `APP${marker - 0xFFE0}`;
            stripped.push({ type: label, detail: `${length} bytes` });
        } else {
            kept.push(src.subarray(offset, offset + total));
        }
        offset += total;
    }

    const totalLen = kept.reduce((sum, s) => sum + s.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const seg of kept) {
        out.set(seg, pos);
        pos += seg.length;
    }
    return { buffer: out.buffer, stripped };
}

export function autoCropCanvas(sourceCanvas, padding = 8, whiteTolerance = 12) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, w, h);

    const isBackground = (idx) => {
        const a = data[idx + 3];
        if (a <= 10) return true;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        return r >= 255 - whiteTolerance && g >= 255 - whiteTolerance && b >= 255 - whiteTolerance;
    };

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (!isBackground(idx)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return sourceCanvas;
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropW + padding * 2;
    outCanvas.height = cropH + padding * 2;

    const outCtx = outCanvas.getContext('2d');
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, padding, padding, cropW, cropH);
    return outCanvas;
}

export function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to decode image.'));
        };
        img.src = url;
    });
}

export async function fileToCanvas(file, targetWidth = null) {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    if (isSvg) {
        const svgText = await file.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const img = await loadImageFromBlob(svgBlob);
        const natW = img.naturalWidth || 800;
        const natH = img.naturalHeight || 600;
        const outW = targetWidth && targetWidth > 0 ? targetWidth : natW;
        const outH = Math.max(1, Math.round((natH / natW) * outW));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);
        return canvas;
    }

    const img = await loadImageFromBlob(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

export async function canvasToDpiPngBlob(canvas, targetDpi) {
    const rawBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png');
    });
    const rawBuf = await rawBlob.arrayBuffer();
    const dpiBuf = changePngDpi(rawBuf, targetDpi);
    return new Blob([dpiBuf], { type: 'image/png' });
}
