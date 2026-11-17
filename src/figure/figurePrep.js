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

export function initFigurePrep() {
    const dropZone = document.getElementById('dpi-drop-zone');
    const fileInput = document.getElementById('dpi-file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const fileDetails = document.getElementById('file-details');
    const fileDetailsName = document.getElementById('file-details-name');
    const fileDetailsSize = document.getElementById('file-details-size');

    const targetDpiSelect = document.getElementById('target-dpi');
    const stripMetaCheckbox = document.getElementById('prep-strip-metadata');
    const autoCropCheckbox = document.getElementById('prep-auto-crop');
    const cropPaddingInput = document.getElementById('prep-crop-padding');
    const cropOptionsRow = document.getElementById('prep-crop-options');
    const svgWidthGroup = document.getElementById('prep-svg-width-group');
    const svgWidthInput = document.getElementById('prep-svg-width');
    const btnConvert = document.getElementById('btn-convert-dpi');

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
            handleFileSelect(e.target.files[0]);
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
            handleFileSelect(e.dataTransfer.files[0]);
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

    btnConvert.addEventListener('click', async () => {
        if (!currentFile) return;

        btnConvert.disabled = true;
        btnConvert.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Processing...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const targetDpi = parseInt(targetDpiSelect.value, 10);
            const shouldStrip = stripMetaCheckbox.checked;
            const shouldCrop = autoCropCheckbox.checked;
            const padding = Math.max(0, parseInt(cropPaddingInput.value, 10) || 0);
            const svgWidth = Math.max(200, parseInt(svgWidthInput.value, 10) || 2400);

            const isSvg = fileMetadata.format === 'SVG';
            const isWebp = fileMetadata.format === 'WEBP';
            let outBlob;
            let outExt;

            if (!shouldCrop && !isSvg && !isWebp) {
                // Lossless byte-level path for PNG/JPEG
                let buf = fileMetadata.rawBuffer;
                if (fileMetadata.format === 'PNG') {
                    if (shouldStrip) {
                        buf = stripPngMetadata(buf).buffer;
                    }
                    buf = changePngDpi(buf, targetDpi);
                    outBlob = new Blob([buf], { type: 'image/png' });
                    outExt = '.png';
                } else if (fileMetadata.format === 'JPEG') {
                    if (shouldStrip) {
                        buf = stripJpegMetadata(buf).buffer;
                    }
                    buf = changeJpegDpi(buf, targetDpi);
                    outBlob = new Blob([buf], { type: 'image/jpeg' });
                    outExt = '.jpg';
                } else {
                    throw new Error('TIFF client-side conversion is restricted. Please use PNG, JPEG, or SVG.');
                }
            } else {
                // Canvas pipeline (SVG rasterization, Auto-Crop, or WebP -> PNG)
                let canvas = await fileToCanvas(currentFile, isSvg ? svgWidth : null);
                if (shouldCrop) {
                    canvas = autoCropCanvas(canvas, padding);
                }
                outBlob = await canvasToDpiPngBlob(canvas, targetDpi);
                outExt = '.png';
            }

            const origName = currentFile.name;
            const dotIdx = origName.lastIndexOf('.');
            const baseName = dotIdx !== -1 ? origName.substring(0, dotIdx) : origName;

            const link = document.createElement('a');
            link.download = `${baseName}_${targetDpi}dpi${outExt}`;
            link.href = URL.createObjectURL(outBlob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error(err);
            alert(`Error processing figure: ${err.message}`);
        } finally {
            btnConvert.disabled = false;
            btnConvert.innerHTML = `<i data-lucide="download"></i> Process & Download`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    async function handleFileSelect(file) {
        const lower = file.name.toLowerCase();
        const isSvg = file.type === 'image/svg+xml' || lower.endsWith('.svg');
        const isPng = file.type === 'image/png' || lower.endsWith('.png');
        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg' || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
        const isWebp = file.type === 'image/webp' || lower.endsWith('.webp');
        const isTiff = file.type === 'image/tiff' || lower.endsWith('.tif') || lower.endsWith('.tiff');

        if (!isSvg && !isPng && !isJpeg && !isWebp && !isTiff) {
            alert('Unsupported file format. Please upload PNG, JPEG, SVG, or WebP.');
            return;
        }

        currentFile = file;
        dropZone.style.display = 'none';
        fileDetails.classList.remove('hidden');
        fileDetailsName.textContent = file.name;
        fileDetailsSize.textContent = formatBytes(file.size);

        const format = isSvg ? 'SVG' : isPng ? 'PNG' : isJpeg ? 'JPEG' : isWebp ? 'WEBP' : 'TIFF';
        fileMetadata.format = format;
        svgWidthGroup.style.display = isSvg ? 'block' : 'none';

        if (isTiff) {
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
            await refreshPreviewAndMeta();
        } catch (err) {
            console.error(err);
            alert(`Failed to read figure: ${err.message}`);
            resetState();
        }
    }

    async function refreshPreviewAndMeta() {
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
        currentFile = null;
        fileInput.value = '';
        dropZone.style.display = 'flex';
        fileDetails.classList.add('hidden');
        svgWidthGroup.style.display = 'none';
        previewWrap.classList.add('hidden');
        if (previewImg.dataset.objUrl) {
            URL.revokeObjectURL(previewImg.dataset.objUrl);
            delete previewImg.dataset.objUrl;
        }
        previewImg.removeAttribute('src');
        btnConvert.disabled = true;

        metaOrigDimensions.textContent = '-';
        metaTargetDimensions.textContent = '-';
        metaOrigPrintSize.textContent = '-';
        metaTargetPrintSize.textContent = '-';
        metaOrigDpi.textContent = '-';
        metaTargetDpi.textContent = '-';
        metaOrigFormat.textContent = '-';
        metaTargetFormat.textContent = '-';
        metaStrippedBox.textContent = 'Upload a figure to inspect metadata.';
    }
}
