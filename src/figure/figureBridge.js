import { refreshIcons } from '../icons.js';

/**
 * Copy a PNG Blob (or HTMLCanvasElement) to the system clipboard.
 */
export async function copyPngToClipboard(blobOrCanvas) {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard image copy is not supported in this browser.');
    }

    let pngBlob = blobOrCanvas;
    if (blobOrCanvas instanceof HTMLCanvasElement) {
        pngBlob = await new Promise((resolve, reject) => {
            blobOrCanvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('Failed to encode PNG for clipboard.'))),
                'image/png'
            );
        });
    } else if (blobOrCanvas.type !== 'image/png') {
        // Re-encode non-PNG blobs (e.g., JPEG) to PNG for ClipboardItem compatibility
        const url = URL.createObjectURL(blobOrCanvas);
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('Failed to decode image for clipboard.'));
                el.src = url;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            pngBlob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Failed to encode PNG for clipboard.'))),
                    'image/png'
                );
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

/**
 * Extract the first pasted image File from a ClipboardEvent, or null if none.
 */
export function extractClipboardImageFile(event) {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            const ext = file.type.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
            const name = file.name && file.name !== 'image.png'
                ? file.name
                : `pasted_figure_${Date.now()}.${ext}`;
            return new File([file], name, { type: file.type });
        }
    }
    return null;
}

/**
 * Temporarily swap a button's innerHTML for confirmation feedback.
 */
export function flashButtonFeedback(btn, html, durationMs = 1800) {
    const prevHtml = btn.innerHTML;
    btn.innerHTML = html;
    refreshIcons();
    setTimeout(() => {
        btn.innerHTML = prevHtml;
        refreshIcons();
    }, durationMs);
}
