import { canvasToDpiPngBlob, fileToCanvas } from './dpiMetadata.js';

// Linear RGB simulation matrices (Viénot 1999 / Machado et al.)
const CVD_MATRICES = {
    deuteranopia: [
        [0.625, 0.375, 0.0],
        [0.70, 0.30, 0.0],
        [0.0, 0.30, 0.70],
    ],
    protanopia: [
        [0.56667, 0.43333, 0.0],
        [0.55833, 0.44167, 0.0],
        [0.0, 0.24167, 0.75833],
    ],
    tritanopia: [
        [0.95, 0.05, 0.0],
        [0.0, 0.43333, 0.56667],
        [0.0, 0.475, 0.525],
    ],
};

function srgbToLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
    const clamped = Math.max(0, Math.min(1, v));
    const s = clamped <= 0.0031308
        ? clamped * 12.92
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
}

function applySimulation(sourceCanvas, targetCanvas, mode) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    targetCanvas.width = w;
    targetCanvas.height = h;

    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const dstCtx = targetCanvas.getContext('2d');
    const srcImg = srcCtx.getImageData(0, 0, w, h);
    const dstImg = dstCtx.createImageData(w, h);
    const src = srcImg.data;
    const dst = dstImg.data;

    if (mode === 'original') {
        dst.set(src);
        dstCtx.putImageData(dstImg, 0, 0);
        return;
    }

    if (mode === 'grayscale') {
        for (let i = 0; i < src.length; i += 4) {
            const lum = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
            dst[i] = lum;
            dst[i + 1] = lum;
            dst[i + 2] = lum;
            dst[i + 3] = src[i + 3];
        }
        dstCtx.putImageData(dstImg, 0, 0);
        return;
    }

    const m = CVD_MATRICES[mode];
    for (let i = 0; i < src.length; i += 4) {
        const lr = srgbToLinear(src[i]);
        const lg = srgbToLinear(src[i + 1]);
        const lb = srgbToLinear(src[i + 2]);

        const nr = m[0][0] * lr + m[0][1] * lg + m[0][2] * lb;
        const ng = m[1][0] * lr + m[1][1] * lg + m[1][2] * lb;
        const nb = m[2][0] * lr + m[2][1] * lg + m[2][2] * lb;

        dst[i] = linearToSrgb(nr);
        dst[i + 1] = linearToSrgb(ng);
        dst[i + 2] = linearToSrgb(nb);
        dst[i + 3] = src[i + 3];
    }
    dstCtx.putImageData(dstImg, 0, 0);
}

export function initAccessibilitySim() {
    const dropZone = document.getElementById('a11y-drop-zone');
    const fileInput = document.getElementById('a11y-file-input');
    const btnBrowse = document.getElementById('btn-a11y-browse');
    const btnReset = document.getElementById('btn-a11y-reset');
    const btnDownloadSheet = document.getElementById('btn-a11y-download');
    const resultsWrap = document.getElementById('a11y-results');
    const fileTitle = document.getElementById('a11y-file-name');

    const canvasMap = {
        original: document.getElementById('a11y-canvas-original'),
        deuteranopia: document.getElementById('a11y-canvas-deuteranopia'),
        protanopia: document.getElementById('a11y-canvas-protanopia'),
        tritanopia: document.getElementById('a11y-canvas-tritanopia'),
        grayscale: document.getElementById('a11y-canvas-grayscale'),
    };

    let currentName = '';
    let hasImage = false;

    btnBrowse.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleFile(e.target.files[0]);
            fileInput.value = '';
        }
    });

    ['dragenter', 'dragover'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', async (e) => {
        if (e.dataTransfer.files.length > 0) {
            await handleFile(e.dataTransfer.files[0]);
        }
    });

    btnReset.addEventListener('click', () => {
        hasImage = false;
        currentName = '';
        resultsWrap.classList.add('hidden');
        dropZone.style.display = 'flex';
        btnDownloadSheet.disabled = true;
    });

    btnDownloadSheet.addEventListener('click', async () => {
        if (!hasImage) return;
        const modes = [
            ['original', 'Original'],
            ['deuteranopia', 'Deuteranopia (Red-Green)'],
            ['protanopia', 'Protanopia (Red-Weak)'],
            ['tritanopia', 'Tritanopia (Blue-Yellow)'],
            ['grayscale', 'Grayscale Print'],
        ];

        const srcW = canvasMap.original.width;
        const srcH = canvasMap.original.height;
        const cols = 3;
        const rows = 2;
        const cellW = Math.min(800, srcW);
        const cellH = Math.round((srcH / srcW) * cellW);
        const gap = 24;
        const headerH = 34;

        const sheet = document.createElement('canvas');
        sheet.width = gap + cols * (cellW + gap);
        sheet.height = gap + rows * (cellH + headerH + gap);
        const ctx = sheet.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheet.width, sheet.height);
        ctx.font = '700 18px Inter, Arial, sans-serif';
        ctx.textBaseline = 'top';

        modes.forEach(([key, title], idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const x = gap + c * (cellW + gap);
            const y = gap + r * (cellH + headerH + gap);

            ctx.fillStyle = '#0f172a';
            ctx.fillText(title, x, y + 4);
            ctx.drawImage(canvasMap[key], x, y + headerH, cellW, cellH);
        });

        const blob = await canvasToDpiPngBlob(sheet, 150);
        const dotIdx = currentName.lastIndexOf('.');
        const base = dotIdx !== -1 ? currentName.substring(0, dotIdx) : currentName || 'figure';
        const link = document.createElement('a');
        link.download = `${base}_accessibility_check.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    async function handleFile(file) {
        const lower = file.name.toLowerCase();
        if (!file.type.startsWith('image/') && !lower.endsWith('.svg')) {
            alert('Please upload a PNG, JPEG, SVG, or WebP figure.');
            return;
        }

        try {
            const rawCanvas = await fileToCanvas(file, 1400);
            // Downscale for fast, crisp interactive simulation if huge
            const maxDim = 1100;
            let workCanvas = rawCanvas;
            if (rawCanvas.width > maxDim || rawCanvas.height > maxDim) {
                const ratio = Math.min(maxDim / rawCanvas.width, maxDim / rawCanvas.height);
                workCanvas = document.createElement('canvas');
                workCanvas.width = Math.round(rawCanvas.width * ratio);
                workCanvas.height = Math.round(rawCanvas.height * ratio);
                const wCtx = workCanvas.getContext('2d');
                wCtx.drawImage(rawCanvas, 0, 0, workCanvas.width, workCanvas.height);
            }

            Object.entries(canvasMap).forEach(([mode, targetCanvas]) => {
                applySimulation(workCanvas, targetCanvas, mode);
            });

            currentName = file.name;
            hasImage = true;
            fileTitle.textContent = `${file.name} (${rawCanvas.width} × ${rawCanvas.height} px)`;
            dropZone.style.display = 'none';
            resultsWrap.classList.remove('hidden');
            btnDownloadSheet.disabled = false;
        } catch (err) {
            console.error(err);
            alert(`Failed to load figure: ${err.message}`);
        }
    }

    return { handleFile };
}
