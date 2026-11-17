import {
    autoCropCanvas,
    canvasToDpiPngBlob,
    changeJpegDpi,
    changePngDpi,
    fileToCanvas,
    formatBytes,
    getJpegDpi,
    getPngDpi,
    stripJpegMetadata,
    stripPngMetadata,
} from './dpiMetadata.js';
import { copyPngToClipboard, flashButtonFeedback } from './figureBridge.js';
import { refreshIcons } from '../icons.js';

export function initFigurePrep({ onSendToPanel, onSendToAccessibility } = {}) {
    const dropZone = document.getElementById('dpi-drop-zone');
    const fileInput = document.getElementById('dpi-file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const fileDetails = document.getElementById('file-details');
    const fileDetailsName = document.getElementById('file-details-name');
    const fileDetailsSize = document.getElementById('file-details-size');
    const batchListEl = document.getElementById('prep-batch-list');

    const targetDpiSelect = document.getElementById('target-dpi');
    const stripMetaCheckbox = document.getElementById('prep-strip-metadata');
    const autoCropCheckbox = document.getElementById('prep-auto-crop');
    const cropPaddingInput = document.getElementById('prep-crop-padding');
    const cropOptionsRow = document.getElementById('prep-crop-options');
    const svgWidthGroup = document.getElementById('prep-svg-width-group');
    const svgWidthInput = document.getElementById('prep-svg-width');
    const btnConvert = document.getElementById('btn-convert-dpi');
    const btnCopy = document.getElementById('btn-prep-copy');
    const btnToPanel = document.getElementById('btn-prep-to-panel');
    const btnToA11y = document.getElementById('btn-prep-to-a11y');

    const metaOrigDimensions = document.getElementById('meta-orig-dimensions');
    const metaTargetDimensions = document.getElementById('meta-target-dimensions');
    const metaOrigPrintSize = document.getElementById('meta-orig-print-size');
    const metaTargetPrintSize = document.getElementById('meta-target-print-size');
    const metaOrigDpi = document.getElementById('meta-orig-dpi');
    const metaTargetDpi = document.getElementById('meta-target-dpi');
    const metaOrigFormat = document.getElementById('meta-orig-format');
    const metaTargetFormat = document.getElementById('meta-target-format');
    const metaStrippedBox = document.getElementById('prep-stripped-summary');
    const previewImg = document.getElementById('prep-preview-img');
    const previewWrap = document.getElementById('prep-preview-wrap');

    let queuedFiles = [];
    let currentFile = null;
    let fileMetadata = {
        width: 0,
        height: 0,
        origDPI: 72,
        format: '',
        rawBuffer: null,
        strippedPreview: [],
    };

    btnSelectFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
            fileInput.value = '';
        }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    btnRemoveFile.addEventListener('click', resetState);

    autoCropCheckbox.addEventListener('change', () => {
        cropOptionsRow.style.display = autoCropCheckbox.checked ? 'flex' : 'none';
        refreshPreviewAndMeta();
    });

    [targetDpiSelect, stripMetaCheckbox, cropPaddingInput, svgWidthInput].forEach((el) => {
        el.addEventListener('change', refreshPreviewAndMeta);
    });

    function detectFormat(file) {
        const lower = file.name.toLowerCase();
        if (file.type === 'image/svg+xml' || lower.endsWith('.svg')) return 'SVG';
        if (file.type === 'image/png' || lower.endsWith('.png')) return 'PNG';
        if (file.type === 'image/jpeg' || file.type === 'image/jpg' || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPEG';
        if (file.type === 'image/webp' || lower.endsWith('.webp')) return 'WEBP';
        if (file.type === 'image/tiff' || lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'TIFF';
        return null;
    }

    async function processFileToBlob(file, formatHint = null, rawBufferHint = null) {
        const format = formatHint || detectFormat(file);
        if (!format || format === 'TIFF') {
            throw new Error(`Unsupported format for "${file.name}". Please use PNG, JPEG, SVG, or WebP.`);
        }

        const targetDpi = parseInt(targetDpiSelect.value, 10);
        const shouldStrip = stripMetaCheckbox.checked;
        const shouldCrop = autoCropCheckbox.checked;
        const padding = Math.max(0, parseInt(cropPaddingInput.value, 10) || 0);
        const svgWidth = Math.max(200, parseInt(svgWidthInput.value, 10) || 2400);

        const isSvg = format === 'SVG';
        const isWebp = format === 'WEBP';

        let outBlob;
        let outExt;

        if (!shouldCrop && !isSvg && !isWebp) {
            let buf = rawBufferHint || await file.arrayBuffer();
            if (format === 'PNG') {
                if (shouldStrip) buf = stripPngMetadata(buf).buffer;
                buf = changePngDpi(buf, targetDpi);
                outBlob = new Blob([buf], { type: 'image/png' });
                outExt = '.png';
            } else if (format === 'JPEG') {
                if (shouldStrip) buf = stripJpegMetadata(buf).buffer;
                buf = changeJpegDpi(buf, targetDpi);
                outBlob = new Blob([buf], { type: 'image/jpeg' });
                outExt = '.jpg';
            }
        } else {
            let canvas = await fileToCanvas(file, isSvg ? svgWidth : null);
            if (shouldCrop) {
                canvas = autoCropCanvas(canvas, padding);
            }
            outBlob = await canvasToDpiPngBlob(canvas, targetDpi);
            outExt = '.png';
        }

        const dotIdx = file.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        return {
            blob: outBlob,
            filename: `${baseName}_${targetDpi}dpi${outExt}`,
        };
    }

    function triggerDownload(blob, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    btnConvert.addEventListener('click', async () => {
        if (queuedFiles.length === 0) return;

        btnConvert.disabled = true;
        btnConvert.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Processing...`;
        refreshIcons();

        try {
            if (queuedFiles.length === 1) {
                const { blob, filename } = await processFileToBlob(
                    currentFile,
                    fileMetadata.format,
                    fileMetadata.rawBuffer
                );
                triggerDownload(blob, filename);
            } else {
                for (let idx = 0; idx < queuedFiles.length; idx++) {
                    const file = queuedFiles[idx];
                    const { blob, filename } = await processFileToBlob(file);
                    triggerDownload(blob, filename);
                    if (idx < queuedFiles.length - 1) {
                        await new Promise((r) => setTimeout(r, 140));
                    }
                }
            }
        } catch (err) {
            console.error(err);
            alert(`Error processing figure: ${err.message}`);
        } finally {
            btnConvert.disabled = false;
            btnConvert.innerHTML = queuedFiles.length > 1
                ? `<i data-lucide="download"></i> Process &amp; Download All (${queuedFiles.length})`
                : `<i data-lucide="download"></i> Process &amp; Download`;
            refreshIcons();
        }
    });

    btnCopy?.addEventListener('click', async () => {
        if (!currentFile || queuedFiles.length !== 1) return;
        try {
            const { blob } = await processFileToBlob(currentFile, fileMetadata.format, fileMetadata.rawBuffer);
            await copyPngToClipboard(blob);
            flashButtonFeedback(btnCopy, `<i data-lucide="check"></i> Copied!`);
        } catch (err) {
            console.error(err);
            alert(`Copy failed: ${err.message}`);
        }
    });

    btnToPanel?.addEventListener('click', async () => {
        if (!currentFile || queuedFiles.length !== 1 || !onSendToPanel) return;
        try {
            const { blob, filename } = await processFileToBlob(currentFile, fileMetadata.format, fileMetadata.rawBuffer);
            const file = new File([blob], filename, { type: blob.type });
            await onSendToPanel([file]);
        } catch (err) {
            console.error(err);
            alert(`Failed to send to Panel Composer: ${err.message}`);
        }
    });

    btnToA11y?.addEventListener('click', async () => {
        if (!currentFile || queuedFiles.length !== 1 || !onSendToAccessibility) return;
        try {
            const { blob, filename } = await processFileToBlob(currentFile, fileMetadata.format, fileMetadata.rawBuffer);
            const file = new File([blob], filename, { type: blob.type });
            await onSendToAccessibility(file);
        } catch (err) {
            console.error(err);
            alert(`Failed to send to Accessibility Check: ${err.message}`);
        }
    });

    async function handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter((f) => {
            const fmt = detectFormat(f);
            return fmt && fmt !== 'TIFF';
        });

        if (validFiles.length === 0) {
            alert('Unsupported file format. Please upload PNG, JPEG, SVG, or WebP.');
            return;
        }

        if (validFiles.length === 1) {
            await handleSingleFile(validFiles[0]);
            return;
        }

        // Batch mode (> 1 files)
        queuedFiles = validFiles;
        currentFile = null;
        dropZone.style.display = 'none';
        fileDetails.classList.remove('hidden');
        const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
        fileDetailsName.textContent = `${validFiles.length} figures queued (Batch mode)`;
        fileDetailsSize.textContent = `${formatBytes(totalSize)} total`;

        batchListEl.innerHTML = '';
        batchListEl.classList.remove('hidden');
        validFiles.forEach((f, idx) => {
            const row = document.createElement('div');
            row.className = 'panel-item-row';
            row.innerHTML = `
                <span class="panel-item-badge">#${idx + 1}</span>
                <span class="panel-item-name" title="${f.name}">${f.name}</span>
                <span class="panel-item-dim">${formatBytes(f.size)}</span>
            `;
            batchListEl.appendChild(row);
        });

        const hasSvg = validFiles.some((f) => detectFormat(f) === 'SVG');
        svgWidthGroup.style.display = hasSvg ? 'block' : 'none';
        previewWrap.classList.add('hidden');

        btnConvert.disabled = false;
        btnConvert.innerHTML = `<i data-lucide="download"></i> Process &amp; Download All (${validFiles.length})`;
        if (btnCopy) btnCopy.disabled = true;
        if (btnToPanel) btnToPanel.disabled = true;
        if (btnToA11y) btnToA11y.disabled = true;

        const targetDpi = parseInt(targetDpiSelect.value, 10);
        metaOrigDimensions.textContent = `${validFiles.length} files`;
        metaTargetDimensions.textContent = 'Batch';
        metaOrigPrintSize.textContent = '-';
        metaTargetPrintSize.textContent = '-';
        metaOrigDpi.textContent = 'Mixed';
        metaTargetDpi.textContent = `${targetDpi} DPI`;
        metaOrigFormat.textContent = 'Mixed';
        metaTargetFormat.textContent = autoCropCheckbox.checked ? 'PNG' : 'Original / PNG';
        metaStrippedBox.textContent = `Batch ready: ${validFiles.length} figures will be processed with current DPI, metadata strip, and crop settings.`;
        refreshIcons();
    }

    async function handleSingleFile(file) {
        const format = detectFormat(file);
        if (!format) {
            alert('Unsupported file format. Please upload PNG, JPEG, SVG, or WebP.');
            return;
        }

        queuedFiles = [file];
        currentFile = file;
        dropZone.style.display = 'none';
        batchListEl.classList.add('hidden');
        batchListEl.innerHTML = '';
        fileDetails.classList.remove('hidden');
        fileDetailsName.textContent = file.name;
        fileDetailsSize.textContent = formatBytes(file.size);

        const isSvg = format === 'SVG';
        fileMetadata.format = format;
        svgWidthGroup.style.display = isSvg ? 'block' : 'none';

        if (format === 'TIFF') {
            btnConvert.disabled = true;
            alert('TIFF client-side conversion is restricted in browsers. Please export as PNG, JPEG, or SVG.');
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            fileMetadata.rawBuffer = arrayBuffer;

            let origDpi = 72;
            let strippedPreview = [];
            if (format === 'PNG') {
                origDpi = getPngDpi(arrayBuffer) || 72;
                strippedPreview = stripPngMetadata(arrayBuffer).stripped;
            } else if (format === 'JPEG') {
                origDpi = getJpegDpi(arrayBuffer) || 72;
                strippedPreview = stripJpegMetadata(arrayBuffer).stripped;
            }
            fileMetadata.origDPI = origDpi;
            fileMetadata.strippedPreview = strippedPreview;

            const canvas = await fileToCanvas(file, isSvg ? parseInt(svgWidthInput.value, 10) || 2400 : null);
            fileMetadata.width = canvas.width;
            fileMetadata.height = canvas.height;

            btnConvert.disabled = false;
            btnConvert.innerHTML = `<i data-lucide="download"></i> Process &amp; Download`;
            if (btnCopy) btnCopy.disabled = false;
            if (btnToPanel) btnToPanel.disabled = false;
            if (btnToA11y) btnToA11y.disabled = false;
            refreshIcons();

            await refreshPreviewAndMeta();
        } catch (err) {
            console.error(err);
            alert(`Failed to read figure: ${err.message}`);
            resetState();
        }
    }

    async function refreshPreviewAndMeta() {
        if (queuedFiles.length > 1) {
            const targetDpi = parseInt(targetDpiSelect.value, 10);
            metaTargetDpi.textContent = `${targetDpi} DPI`;
            metaTargetFormat.textContent = autoCropCheckbox.checked ? 'PNG' : 'Original / PNG';
            return;
        }
        if (!currentFile || fileMetadata.format === 'TIFF') return;

        const targetDpi = parseInt(targetDpiSelect.value, 10);
        const shouldStrip = stripMetaCheckbox.checked;
        const shouldCrop = autoCropCheckbox.checked;
        const padding = Math.max(0, parseInt(cropPaddingInput.value, 10) || 0);
        const isSvg = fileMetadata.format === 'SVG';
        const svgWidth = Math.max(200, parseInt(svgWidthInput.value, 10) || 2400);

        let targetW = fileMetadata.width;
        let targetH = fileMetadata.height;
        let previewUrl = null;

        if (isSvg || shouldCrop || fileMetadata.format === 'WEBP') {
            let canvas = await fileToCanvas(currentFile, isSvg ? svgWidth : null);
            if (shouldCrop) {
                canvas = autoCropCanvas(canvas, padding);
            }
            targetW = canvas.width;
            targetH = canvas.height;
            previewUrl = canvas.toDataURL('image/png');
        } else {
            previewUrl = URL.createObjectURL(currentFile);
        }

        if (previewImg.dataset.objUrl) {
            URL.revokeObjectURL(previewImg.dataset.objUrl);
            delete previewImg.dataset.objUrl;
        }
        if (previewUrl.startsWith('blob:')) {
            previewImg.dataset.objUrl = previewUrl;
        }
        previewImg.src = previewUrl;
        previewWrap.classList.remove('hidden');

        const outFormat = (isSvg || shouldCrop || fileMetadata.format === 'WEBP') ? 'PNG' : fileMetadata.format;

        metaOrigDimensions.textContent = `${fileMetadata.width} x ${fileMetadata.height} px`;
        metaTargetDimensions.textContent = `${targetW} x ${targetH} px`;

        const origWIn = (fileMetadata.width / fileMetadata.origDPI).toFixed(2);
        const origHIn = (fileMetadata.height / fileMetadata.origDPI).toFixed(2);
        const targetWIn = (targetW / targetDpi).toFixed(2);
        const targetHIn = (targetH / targetDpi).toFixed(2);

        metaOrigPrintSize.textContent = `${origWIn}" x ${origHIn}"`;
        metaTargetPrintSize.textContent = `${targetWIn}" x ${targetHIn}"`;
        metaOrigDpi.textContent = isSvg ? 'Vector' : `${fileMetadata.origDPI} DPI`;
        metaTargetDpi.textContent = `${targetDpi} DPI`;
        metaOrigFormat.textContent = fileMetadata.format;
        metaTargetFormat.textContent = outFormat;

        if (!shouldStrip) {
            metaStrippedBox.textContent = 'Metadata stripping is turned off.';
        } else if (isSvg || shouldCrop || fileMetadata.format === 'WEBP') {
            metaStrippedBox.textContent = 'Clean PNG output: no EXIF/XMP/software metadata will be included.';
        } else if (fileMetadata.strippedPreview.length === 0) {
            metaStrippedBox.textContent = 'No sensitive EXIF/text metadata chunks detected in this file.';
        } else {
            const summary = fileMetadata.strippedPreview
                .slice(0, 5)
                .map((item) => `${item.type} (${item.detail})`)
                .join(', ');
            const extra = fileMetadata.strippedPreview.length > 5
                ? ` +${fileMetadata.strippedPreview.length - 5} more`
                : '';
            metaStrippedBox.textContent = `Will strip ${fileMetadata.strippedPreview.length} metadata block(s): ${summary}${extra}`;
        }
    }

    function resetState() {
        queuedFiles = [];
        currentFile = null;
        fileInput.value = '';
        dropZone.style.display = 'flex';
        fileDetails.classList.add('hidden');
        batchListEl.classList.add('hidden');
        batchListEl.innerHTML = '';
        svgWidthGroup.style.display = 'none';
        previewWrap.classList.add('hidden');
        if (previewImg.dataset.objUrl) {
            URL.revokeObjectURL(previewImg.dataset.objUrl);
            delete previewImg.dataset.objUrl;
        }
        previewImg.removeAttribute('src');
        btnConvert.disabled = true;
        btnConvert.innerHTML = `<i data-lucide="download"></i> Process &amp; Download`;
        if (btnCopy) btnCopy.disabled = true;
        if (btnToPanel) btnToPanel.disabled = true;
        if (btnToA11y) btnToA11y.disabled = true;

        metaOrigDimensions.textContent = '-';
        metaTargetDimensions.textContent = '-';
        metaOrigPrintSize.textContent = '-';
        metaTargetPrintSize.textContent = '-';
        metaOrigDpi.textContent = '-';
        metaTargetDpi.textContent = '-';
        metaOrigFormat.textContent = '-';
        metaTargetFormat.textContent = '-';
        metaStrippedBox.textContent = 'Upload a figure to inspect metadata.';
        refreshIcons();
    }

    return { handleFiles };
}
