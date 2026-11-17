import { canvasToDpiPngBlob, fileToCanvas } from './dpiMetadata.js';
import { copyPngToClipboard, flashButtonFeedback } from './figureBridge.js';
import { refreshIcons } from '../icons.js';

export function initPanelComposer({ onSendToAccessibility } = {}) {
    const dropZone = document.getElementById('panel-drop-zone');
    const fileInput = document.getElementById('panel-file-input');
    const btnBrowse = document.getElementById('btn-panel-browse');
    const btnClear = document.getElementById('btn-panel-clear');
    const btnExport = document.getElementById('btn-panel-export');
    const btnCopy = document.getElementById('btn-panel-copy');
    const btnToA11y = document.getElementById('btn-panel-to-a11y');
    const listEl = document.getElementById('panel-file-list');
    const previewCanvas = document.getElementById('panel-preview-canvas');
    const previewEmpty = document.getElementById('panel-preview-empty');
    const previewMeta = document.getElementById('panel-preview-meta');

    const colsSelect = document.getElementById('panel-cols');
    const gapInput = document.getElementById('panel-gap');
    const labelStyleSelect = document.getElementById('panel-label-style');
    const labelPosSelect = document.getElementById('panel-label-pos');
    const bgSelect = document.getElementById('panel-bg');
    const exportWidthSelect = document.getElementById('panel-export-width');
    const exportDpiSelect = document.getElementById('panel-export-dpi');

    /** @type {Array<{ id: number, name: string, canvas: HTMLCanvasElement }>} */
    let panels = [];
    let nextId = 1;

    btnBrowse.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await addFiles(e.target.files);
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
            await addFiles(e.dataTransfer.files);
        }
    });

    btnClear.addEventListener('click', () => {
        panels = [];
        renderList();
        renderComposite();
    });

    [colsSelect, gapInput, labelStyleSelect, labelPosSelect, bgSelect, exportWidthSelect, exportDpiSelect].forEach((el) => {
        el.addEventListener('change', renderComposite);
    });

    btnExport.addEventListener('click', async () => {
        if (panels.length === 0) return;

        btnExport.disabled = true;
        btnExport.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Exporting...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const targetWidth = parseInt(exportWidthSelect.value, 10) || 2400;
            const targetDpi = parseInt(exportDpiSelect.value, 10) || 300;
            const outCanvas = buildCompositeCanvas(targetWidth);
            const blob = await canvasToDpiPngBlob(outCanvas, targetDpi);

            const link = document.createElement('a');
            link.download = `figure_panel_${targetDpi}dpi.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error(err);
            alert(`Export failed: ${err.message}`);
        } finally {
            btnExport.disabled = panels.length === 0;
            btnExport.innerHTML = `<i data-lucide="download"></i> Export High-Res PNG`;
            refreshIcons();
        }
    });

    btnCopy?.addEventListener('click', async () => {
        if (panels.length === 0) return;
        try {
            const targetWidth = parseInt(exportWidthSelect.value, 10) || 2400;
            const outCanvas = buildCompositeCanvas(targetWidth);
            await copyPngToClipboard(outCanvas);
            flashButtonFeedback(btnCopy, `<i data-lucide="check"></i> Copied!`);
        } catch (err) {
            console.error(err);
            alert(`Copy failed: ${err.message}`);
        }
    });

    btnToA11y?.addEventListener('click', async () => {
        if (panels.length === 0 || !onSendToAccessibility) return;
        try {
            const targetWidth = parseInt(exportWidthSelect.value, 10) || 2400;
            const targetDpi = parseInt(exportDpiSelect.value, 10) || 300;
            const outCanvas = buildCompositeCanvas(targetWidth);
            const blob = await canvasToDpiPngBlob(outCanvas, targetDpi);
            const file = new File([blob], `figure_panel_${targetDpi}dpi.png`, { type: 'image/png' });
            await onSendToAccessibility(file);
        } catch (err) {
            console.error(err);
            alert(`Failed to send to Accessibility Check: ${err.message}`);
        }
    });

    async function addFiles(fileList) {
        for (const file of Array.from(fileList)) {
            const lower = file.name.toLowerCase();
            if (!file.type.startsWith('image/') && !lower.endsWith('.svg')) continue;
            try {
                const canvas = await fileToCanvas(file, 1600);
                panels.push({ id: nextId++, name: file.name, canvas });
            } catch (err) {
                console.warn(`Skipped ${file.name}:`, err);
            }
        }
        renderList();
        renderComposite();
    }

    function formatLabel(index, style) {
        if (style === 'none') return '';
        const letter = String.fromCharCode(97 + (index % 26));
        if (style === 'paren-lower') return `(${letter})`;
        if (style === 'lower') return letter;
        if (style === 'paren-upper') return `(${letter.toUpperCase()})`;
        if (style === 'upper') return letter.toUpperCase();
        return '';
    }

    function renderList() {
        listEl.innerHTML = '';
        btnExport.disabled = panels.length === 0;
        btnClear.disabled = panels.length === 0;
        if (btnCopy) btnCopy.disabled = panels.length === 0;
        if (btnToA11y) btnToA11y.disabled = panels.length === 0;

        panels.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'panel-item-row';

            const labelBadge = formatLabel(idx, labelStyleSelect.value) || `#${idx + 1}`;
            row.innerHTML = `
                <span class="panel-item-badge">${labelBadge}</span>
                <span class="panel-item-name" title="${p.name}">${p.name}</span>
                <span class="panel-item-dim">${p.canvas.width}×${p.canvas.height}</span>
                <div class="panel-item-actions">
                    <button type="button" class="btn-icon" data-action="up" ${idx === 0 ? 'disabled' : ''} title="Move earlier">
                        <i data-lucide="chevron-up"></i>
                    </button>
                    <button type="button" class="btn-icon" data-action="down" ${idx === panels.length - 1 ? 'disabled' : ''} title="Move later">
                        <i data-lucide="chevron-down"></i>
                    </button>
                    <button type="button" class="btn-icon btn-danger-icon" data-action="remove" title="Remove">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `;

            row.querySelector('[data-action="up"]').addEventListener('click', () => {
                if (idx === 0) return;
                [panels[idx - 1], panels[idx]] = [panels[idx], panels[idx - 1]];
                renderList();
                renderComposite();
            });
            row.querySelector('[data-action="down"]').addEventListener('click', () => {
                if (idx === panels.length - 1) return;
                [panels[idx + 1], panels[idx]] = [panels[idx], panels[idx + 1]];
                renderList();
                renderComposite();
            });
            row.querySelector('[data-action="remove"]').addEventListener('click', () => {
                panels = panels.filter((item) => item.id !== p.id);
                renderList();
                renderComposite();
            });

            listEl.appendChild(row);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function buildCompositeCanvas(targetWidth) {
        const count = panels.length;
        const colsSetting = colsSelect.value;
        const cols = colsSetting === 'auto'
            ? (count <= 1 ? 1 : count <= 3 ? count : count === 4 ? 2 : 3)
            : Math.min(count, Math.max(1, parseInt(colsSetting, 10) || 2));
        const rows = Math.ceil(count / cols);

        const gap = Math.max(0, parseInt(gapInput.value, 10) || 0);
        const outerPad = Math.round(gap * 0.75);
        const labelStyle = labelStyleSelect.value;
        const labelPos = labelPosSelect.value;
        const bgMode = bgSelect.value;

        const scaleFactor = targetWidth / 1200;
        const scaledGap = Math.round(gap * scaleFactor);
        const scaledPad = Math.round(outerPad * scaleFactor);
        const cellWidth = Math.floor((targetWidth - scaledPad * 2 - scaledGap * (cols - 1)) / cols);

        const fontSize = Math.max(18, Math.round(cellWidth * 0.065));
        const headerBand = (labelStyle !== 'none' && labelPos === 'above') ? Math.round(fontSize * 1.55) : 0;

        // Compute per-row uniform height based on max aspect ratio in that row
        const rowHeights = [];
        for (let r = 0; r < rows; r++) {
            let maxImgH = 0;
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (idx >= count) break;
                const p = panels[idx];
                const h = Math.round((p.canvas.height / p.canvas.width) * cellWidth);
                if (h > maxImgH) maxImgH = h;
            }
            rowHeights.push(maxImgH + headerBand);
        }

        const totalHeight = scaledPad * 2 + rowHeights.reduce((a, b) => a + b, 0) + scaledGap * (rows - 1);
        const out = document.createElement('canvas');
        out.width = targetWidth;
        out.height = Math.max(1, totalHeight);

        const ctx = out.getContext('2d');
        if (bgMode === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, out.width, out.height);
        }

        ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
        ctx.textBaseline = 'top';

        let curY = scaledPad;
        for (let r = 0; r < rows; r++) {
            const rowH = rowHeights[r];
            const imgAreaH = rowH - headerBand;

            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (idx >= count) break;

                const p = panels[idx];
                const cellX = scaledPad + c * (cellWidth + scaledGap);
                const imgY = curY + headerBand;

                // Fit image proportionally inside (cellWidth, imgAreaH)
                const ratio = Math.min(cellWidth / p.canvas.width, imgAreaH / p.canvas.height);
                const drawW = Math.round(p.canvas.width * ratio);
                const drawH = Math.round(p.canvas.height * ratio);
                const drawX = cellX + Math.round((cellWidth - drawW) / 2);
                const drawY = imgY + Math.round((imgAreaH - drawH) / 2);

                ctx.drawImage(p.canvas, drawX, drawY, drawW, drawH);

                const labelText = formatLabel(idx, labelStyle);
                if (labelText) {
                    if (labelPos === 'above') {
                        ctx.fillStyle = '#0f172a';
                        ctx.fillText(labelText, cellX, curY + Math.round(fontSize * 0.15));
                    } else {
                        const padX = Math.round(fontSize * 0.35);
                        const padY = Math.round(fontSize * 0.22);
                        const metrics = ctx.measureText(labelText);
                        const boxW = metrics.width + padX * 2;
                        const boxH = fontSize + padY * 2;

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
                        ctx.fillRect(drawX + 8, drawY + 8, boxW, boxH);
                        ctx.fillStyle = '#0f172a';
                        ctx.fillText(labelText, drawX + 8 + padX, drawY + 8 + padY);
                    }
                }
            }
            curY += rowH + scaledGap;
        }

        return out;
    }

    function renderComposite() {
        renderList();
        if (panels.length === 0) {
            previewCanvas.classList.add('hidden');
            previewEmpty.classList.remove('hidden');
            previewMeta.textContent = 'Add 2 or more figures to preview composite layout.';
            return;
        }

        const preview = buildCompositeCanvas(1000);
        previewCanvas.width = preview.width;
        previewCanvas.height = preview.height;
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, preview.width, preview.height);
        ctx.drawImage(preview, 0, 0);

        previewCanvas.classList.remove('hidden');
        previewEmpty.classList.add('hidden');

        const targetW = parseInt(exportWidthSelect.value, 10) || 2400;
        const targetDpi = parseInt(exportDpiSelect.value, 10) || 300;
        const exportH = Math.round((preview.height / preview.width) * targetW);
        previewMeta.textContent = `Export size: ${targetW} × ${exportH} px @ ${targetDpi} DPI (${(targetW / targetDpi).toFixed(2)}" × ${(exportH / targetDpi).toFixed(2)}")`;
    }

    return { addFiles };
}
