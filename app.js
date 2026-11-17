import QRCode from 'qrcode';

/* ==========================================================================
   DBBtoolkits Core Application Logic (Expanded Version)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize core system and utilities
    lucide.createIcons();
    initNavigation();
    initTheme();
    initAccordions();
    
    // 2. Initialize tools
    initQRGenerator();
    initDPIConverter();
    initTableConverter();
    initDiffChecker();
    initBibTeXCleaner();
    initJSONFixer();

    if (isTauriRuntime()) {
        const navLlm = document.getElementById('nav-llm');
        const cardLlm = document.getElementById('card-llm');
        if (navLlm) navLlm.style.display = '';
        if (cardLlm) cardLlm.style.display = '';
        initLLMTester();
    }
});

function isTauriRuntime() {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const root = document.documentElement;
    
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        root.classList.add('light-mode');
        themeBtn.querySelector('span').textContent = 'Dark Mode';
    } else {
        root.classList.remove('light-mode');
        themeBtn.querySelector('span').textContent = 'Light Mode';
    }

    themeBtn.addEventListener('click', () => {
        root.classList.toggle('light-mode');
        const isLight = root.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeBtn.querySelector('span').textContent = isLight ? 'Dark Mode' : 'Light Mode';
        
        lucide.createIcons();
    });
}

// ==========================================================================
// Navigation & Routing
// ==========================================================================
const pages = {
    dashboard: {
        title: "Welcome to DBBtoolkits",
        description: "Select a tool from the sidebar to streamline your scientific research workflow."
    },
    qrcode: {
        title: "QR Code Generator",
        description: "Generate high-resolution QR codes with custom styling for your papers, posters, and web links."
    },
    dpi: {
        title: "Scientific Figure DPI Converter",
        description: "Set the physical print resolution (DPI) of your figures to meet journal publication standards."
    },
    table: {
        title: "Universal Table Converter",
        description: "Convert spreadsheets (Excel/CSV/TSV) to Markdown tables, and vice versa, instantly and locally."
    },
    diff: {
        title: "Local Privacy Diff Checker",
        description: "Compare text versions (abstracts, code, or prompts) safely in your browser without transmitting details."
    },
    bibtex: {
        title: "BibTeX Citation Cleaner",
        description: "Clean BibTeX databases, deduplicate records, strip optional keys, and safeguard proper noun capitalization."
    },
    json: {
        title: "JSON Output Fixer",
        description: "Repair malformed, truncated, or unclosed JSON payloads and format them cleanly in your browser."
    },
    llm: {
        title: "LLM Server Connection Tester",
        description: "Test connectivity, latency, available models, and chat responses on local or LAN LLM servers."
    }
};

function initNavigation() {
    const hash = window.location.hash.substring(1);
    if (hash && pages[hash] && (hash !== 'llm' || isTauriRuntime())) {
        navigateTo(hash);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            navigateTo(targetId);
        });
    });
}

function navigateTo(screenId) {
    if (!pages[screenId]) return;
    if (screenId === 'llm' && !isTauriRuntime()) {
        screenId = 'dashboard';
    }

    window.location.hash = screenId;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${screenId}`) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`screen-${screenId}`).classList.add('active');

    document.getElementById('page-title').textContent = pages[screenId].title;
    document.getElementById('page-description').textContent = pages[screenId].description;
}

// ==========================================================================
// Accordion Helper
// ==========================================================================
function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('open');
        });
    });
}

// ==========================================================================
// QR Code Generator
// ==========================================================================
function initQRGenerator() {
    const txtInput = document.getElementById('qr-text');
    const sizeSelect = document.getElementById('qr-size');
    const errorSelect = document.getElementById('qr-error-level');
    const fgColorInput = document.getElementById('qr-fg-color');
    const fgTextInput = document.getElementById('qr-fg-text');
    const bgColorInput = document.getElementById('qr-bg-color');
    const bgTextInput = document.getElementById('qr-bg-text');
    
    const btnGenerate = document.getElementById('btn-generate-qr');
    const btnDownload = document.getElementById('btn-download-png');
    const canvas = document.getElementById('qr-canvas');
    const placeholder = document.getElementById('qr-placeholder');

    fgColorInput.addEventListener('input', (e) => fgTextInput.value = e.target.value);
    fgTextInput.addEventListener('input', (e) => fgColorInput.value = e.target.value);
    bgColorInput.addEventListener('input', (e) => bgTextInput.value = e.target.value);
    bgTextInput.addEventListener('input', (e) => bgColorInput.value = e.target.value);

    btnGenerate.addEventListener('click', () => {
        const text = txtInput.value.trim();
        if (!text) {
            alert('Please enter a valid text or URL');
            return;
        }

        const size = parseInt(sizeSelect.value);
        const errorLevel = errorSelect.value;
        const fgColor = fgColorInput.value;
        const bgColor = bgColorInput.value;

        btnGenerate.disabled = true;
        btnGenerate.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Generating...`;
        lucide.createIcons();

        setTimeout(() => {
            QRCode.toCanvas(canvas, text, {
                width: size,
                margin: 2,
                errorCorrectionLevel: errorLevel,
                color: {
                    dark: fgColor,
                    light: bgColor
                }
            }, (error) => {
                btnGenerate.disabled = false;
                btnGenerate.innerHTML = `<i data-lucide="play"></i> Generate QR Code`;
                lucide.createIcons();

                if (error) {
                    console.error('QR Gen Error:', error);
                    alert('Failed to generate QR Code. Check input length.');
                    return;
                }

                placeholder.style.display = 'none';
                canvas.style.display = 'block';
                btnDownload.disabled = false;
            });
        }, 100);
    });

    btnDownload.addEventListener('click', () => {
        if (!canvas || canvas.style.display === 'none') return;
        
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `dbb_qr_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================================================
// Scientific Figure DPI Converter
// ==========================================================================
function initDPIConverter() {
    const dropZone = document.getElementById('dpi-drop-zone');
    const fileInput = document.getElementById('dpi-file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const fileDetails = document.getElementById('file-details');
    const fileDetailsName = document.getElementById('file-details-name');
    const fileDetailsSize = document.getElementById('file-details-size');
    const targetDpiSelect = document.getElementById('target-dpi');
    const btnConvert = document.getElementById('btn-convert-dpi');

    const metaOrigDimensions = document.getElementById('meta-orig-dimensions');
    const metaTargetDimensions = document.getElementById('meta-target-dimensions');
    const metaOrigPrintSize = document.getElementById('meta-orig-print-size');
    const metaTargetPrintSize = document.getElementById('meta-target-print-size');
    const metaOrigDpi = document.getElementById('meta-orig-dpi');
    const metaTargetDpi = document.getElementById('meta-target-dpi');
    const metaOrigFormat = document.getElementById('meta-orig-format');
    const metaTargetFormat = document.getElementById('meta-target-format');

    let currentFile = null;
    let fileMetadata = {
        width: 0,
        height: 0,
        origDPI: 72,
        format: ''
    };

    btnSelectFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    btnRemoveFile.addEventListener('click', () => {
        resetDPIState();
    });

    targetDpiSelect.addEventListener('change', () => {
        if (currentFile) {
            updateMetadataTable(fileMetadata.width, fileMetadata.height, fileMetadata.origDPI, parseInt(targetDpiSelect.value), fileMetadata.format);
        }
    });

    btnConvert.addEventListener('click', async () => {
        if (!currentFile) return;

        btnConvert.disabled = true;
        btnConvert.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Converting...`;
        lucide.createIcons();

        try {
            const targetDpi = parseInt(targetDpiSelect.value);
            const arrayBuffer = await currentFile.arrayBuffer();
            let modifiedBuffer = null;

            if (fileMetadata.format === 'PNG') {
                modifiedBuffer = changePngDpi(arrayBuffer, targetDpi);
            } else if (fileMetadata.format === 'JPEG') {
                modifiedBuffer = changeJpegDpi(arrayBuffer, targetDpi);
            } else {
                throw new Error('Format conversion not fully supported client-side.');
            }

            const blob = new Blob([modifiedBuffer], { type: currentFile.type });
            const link = document.createElement('a');
            const origName = currentFile.name;
            const extensionIndex = origName.lastIndexOf('.');
            const nameWithoutExt = extensionIndex !== -1 ? origName.substring(0, extensionIndex) : origName;
            const ext = extensionIndex !== -1 ? origName.substring(extensionIndex) : '';

            link.download = `${nameWithoutExt}_${targetDpi}dpi${ext}`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error(err);
            alert(`Error during conversion: ${err.message}`);
        } finally {
            btnConvert.disabled = false;
            btnConvert.innerHTML = `<i data-lucide="refresh-cw"></i> Convert and Download`;
            lucide.createIcons();
        }
    });

    function handleFileSelect(file) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/tif'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.tiff') && !file.name.endsWith('.tif')) {
            alert('Unsupported file format. Please upload PNG, JPEG, or TIFF.');
            return;
        }

        currentFile = file;

        dropZone.style.display = 'none';
        fileDetails.classList.remove('hidden');
        fileDetailsName.textContent = file.name;
        fileDetailsSize.textContent = formatBytes(file.size);

        let format = 'Unknown';
        if (file.type.includes('png')) format = 'PNG';
        else if (file.type.includes('jpeg') || file.type.includes('jpg')) format = 'JPEG';
        else if (file.type.includes('tiff') || file.name.endsWith('.tiff') || file.name.endsWith('.tif')) format = 'TIFF';
        
        fileMetadata.format = format;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = async function() {
                fileMetadata.width = img.width;
                fileMetadata.height = img.height;
                
                const arrayBuffer = event.target.result;
                let origDpi = 72;

                try {
                    if (format === 'PNG') {
                        origDpi = getPngDpi(arrayBuffer) || 72;
                    } else if (format === 'JPEG') {
                        origDpi = getJpegDpi(arrayBuffer) || 72;
                    }
                } catch(e) {
                    console.warn('Error reading file DPI:', e);
                }

                fileMetadata.origDPI = origDpi;
                updateMetadataTable(img.width, img.height, origDpi, parseInt(targetDpiSelect.value), format);

                if (format === 'TIFF') {
                    btnConvert.disabled = true;
                    alert('TIFF client-side DPI conversion is restricted. TIFF images preserve print sizes but are complex to safely modify in sandboxed browsers. Please convert your file to high-res PNG or JPEG.');
                } else {
                    btnConvert.disabled = false;
                }
            };
            img.src = URL.createObjectURL(new Blob([event.target.result], {type: file.type}));
        };
        reader.readAsArrayBuffer(file);
    }

    function resetDPIState() {
        currentFile = null;
        fileInput.value = '';
        dropZone.style.display = 'flex';
        fileDetails.classList.add('hidden');
        btnConvert.disabled = true;

        metaOrigDimensions.textContent = '-';
        metaTargetDimensions.textContent = '-';
        metaOrigPrintSize.textContent = '-';
        metaTargetPrintSize.textContent = '-';
        metaOrigDpi.textContent = '-';
        metaTargetDpi.textContent = '-';
        metaOrigFormat.textContent = '-';
        metaTargetFormat.textContent = '-';
    }

    function updateMetadataTable(w, h, origDpi, targetDpi, format) {
        metaOrigDimensions.textContent = `${w} x ${h} px`;
        metaTargetDimensions.textContent = `${w} x ${h} px`;
        
        const origWInches = (w / origDpi).toFixed(2);
        const origHInches = (h / origDpi).toFixed(2);
        const targetWInches = (w / targetDpi).toFixed(2);
        const targetHInches = (h / targetDpi).toFixed(2);

        metaOrigPrintSize.textContent = `${origWInches}" x ${origHInches}"`;
        metaTargetPrintSize.textContent = `${targetWInches}" x ${targetHInches}"`;
        
        metaOrigDpi.textContent = `${origDpi} DPI`;
        metaTargetDpi.textContent = `${targetDpi} DPI`;
        
        metaOrigFormat.textContent = format;
        metaTargetFormat.textContent = format;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // ----------------------------------------------------------------------
    // PNG Binary Metadata Parser & Modifier
    // ----------------------------------------------------------------------
    function getPngDpi(buffer) {
        const view = new DataView(buffer);
        let offset = 8;
        
        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const chunkType = getChunkTypeName(view, offset + 4);
            
            if (chunkType === 'pHYs') {
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

    function changePngDpi(buffer, targetDpi) {
        const view = new DataView(buffer);
        const pixelsPerMeter = Math.round(targetDpi / 0.0254);
        
        let offset = 8;
        let physOffset = -1;
        let idatOffset = -1;
        
        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const chunkType = getChunkTypeName(view, offset + 4);
            
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
            const newBuffer = new ArrayBuffer(buffer.byteLength);
            const srcArr = new Uint8Array(buffer);
            const destArr = new Uint8Array(newBuffer);
            destArr.set(srcArr);
            
            const destView = new DataView(newBuffer);
            destView.setUint32(physOffset + 8, pixelsPerMeter);
            destView.setUint32(physOffset + 12, pixelsPerMeter);
            destView.setUint8(physOffset + 16, 1);
            
            const crcData = new Uint8Array(newBuffer, physOffset + 4, 13);
            const crcVal = crc32(crcData);
            destView.setUint32(physOffset + 17, crcVal);
            
            return newBuffer;
        } else {
            const insertPoint = idatOffset !== -1 ? idatOffset : 33;
            const chunkLength = 9;
            const totalChunkSize = 4 + 4 + chunkLength + 4;
            
            const newBuffer = new ArrayBuffer(buffer.byteLength + totalChunkSize);
            const destView = new DataView(newBuffer);
            const srcArr = new Uint8Array(buffer);
            const destArr = new Uint8Array(newBuffer);
            
            destArr.set(srcArr.subarray(0, insertPoint), 0);
            
            destView.setUint32(insertPoint, chunkLength);
            destView.setUint8(insertPoint + 4, 112); // 'p'
            destView.setUint8(insertPoint + 5, 72);  // 'H'
            destView.setUint8(insertPoint + 6, 121); // 'y'
            destView.setUint8(insertPoint + 7, 115); // 's'
            destView.setUint32(insertPoint + 8, pixelsPerMeter);
            destView.setUint32(insertPoint + 12, pixelsPerMeter);
            destView.setUint8(insertPoint + 16, 1);
            
            const crcData = new Uint8Array(newBuffer, insertPoint + 4, 13);
            const crcVal = crc32(crcData);
            destView.setUint32(insertPoint + 17, crcVal);
            
            destArr.set(srcArr.subarray(insertPoint), insertPoint + totalChunkSize);
            
            return newBuffer;
        }
    }

    function getChunkTypeName(view, offset) {
        let name = '';
        for (let i = 0; i < 4; i++) {
            name += String.fromCharCode(view.getUint8(offset + i));
        }
        return name;
    }

    // ----------------------------------------------------------------------
    // JPEG Binary Metadata Parser & Modifier
    // ----------------------------------------------------------------------
    function getJpegDpi(buffer) {
        const view = new DataView(buffer);
        if (view.getUint16(0) !== 0xFFD8) return null;
        
        let offset = 2;
        while (offset < view.byteLength) {
            const marker = view.getUint16(offset);
            if (marker === 0xFFE0) {
                const length = view.getUint16(offset + 2);
                const identifier = getIdentifierString(view, offset + 4, 5);
                if (identifier === 'JFIF\0') {
                    const units = view.getUint8(offset + 13);
                    if (units === 1 || units === 2) {
                        const xDPI = view.getUint16(offset + 14);
                        return units === 1 ? xDPI : Math.round(xDPI * 2.54);
                    }
                }
                offset += 2 + length;
            } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
                const length = view.getUint16(offset + 2);
                offset += 2 + length;
            } else {
                break;
            }
        }
        return null;
    }

    function changeJpegDpi(buffer, targetDpi) {
        const view = new DataView(buffer);
        if (view.getUint16(0) !== 0xFFD8) throw new Error('Not a valid JPEG.');
        
        let offset = 2;
        let app0Offset = -1;
        
        while (offset < view.byteLength) {
            const marker = view.getUint16(offset);
            if (marker === 0xFFE0) {
                const length = view.getUint16(offset + 2);
                const identifier = getIdentifierString(view, offset + 4, 5);
                if (identifier === 'JFIF\0') {
                    app0Offset = offset;
                    break;
                }
                offset += 2 + length;
            } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
                const length = view.getUint16(offset + 2);
                offset += 2 + length;
            } else {
                break;
            }
        }

        if (app0Offset !== -1) {
            const newBuffer = new ArrayBuffer(buffer.byteLength);
            const srcArr = new Uint8Array(buffer);
            const destArr = new Uint8Array(newBuffer);
            destArr.set(srcArr);
            
            const destView = new DataView(newBuffer);
            destView.setUint8(app0Offset + 13, 1);
            destView.setUint16(app0Offset + 14, targetDpi);
            destView.setUint16(app0Offset + 16, targetDpi);
            
            return newBuffer;
        } else {
            const app0SegmentSize = 18;
            const newBuffer = new ArrayBuffer(buffer.byteLength + app0SegmentSize);
            const destView = new DataView(newBuffer);
            const srcArr = new Uint8Array(buffer);
            const destArr = new Uint8Array(newBuffer);
            
            destArr.set(srcArr.subarray(0, 2), 0);
            
            destView.setUint16(2, 0xFFE0);
            destView.setUint16(4, 16);
            destView.setUint8(6, 74);  // 'J'
            destView.setUint8(7, 70);  // 'F'
            destView.setUint8(8, 73);  // 'I'
            destView.setUint8(9, 70);  // 'F'
            destView.setUint8(10, 0);
            destView.setUint8(11, 1);
            destView.setUint8(12, 2);
            destView.setUint8(13, 1);
            destView.setUint16(14, targetDpi);
            destView.setUint16(16, targetDpi);
            destView.setUint8(18, 0);
            destView.setUint8(19, 0);
            
            destArr.set(srcArr.subarray(2), 20);
            
            return newBuffer;
        }
    }

    function getIdentifierString(view, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(view.getUint8(offset + i));
        }
        return str;
    }

    function crc32(buf) {
        let table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[i] = c;
        }
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }
}

// ==========================================================================
// Universal Table Converter (Excel ⇄ Markdown)
// ==========================================================================
function initTableConverter() {
    const rawInput = document.getElementById('table-raw-input');
    const mdOutput = document.getElementById('table-md-output');
    const btnToMd = document.getElementById('btn-table-to-md');
    const btnToTable = document.getElementById('btn-md-to-table');
    const btnClear = document.getElementById('btn-clear-table-input');
    const btnCopy = document.getElementById('btn-copy-table-result');

    btnToMd.addEventListener('click', () => {
        const text = rawInput.value.trim();
        if (!text) {
            alert('Please paste some Excel cells or CSV data first.');
            return;
        }

        // Determine delimiter (default to tab since Excel pastes as TSV)
        let delimiter = '\t';
        if (!text.includes('\t') && text.includes(',')) {
            // Fallback to comma if no tabs but commas exist
            delimiter = ',';
        }

        const lines = text.split('\n');
        const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));

        // Calculate max string length of each column for visual padding/alignment
        const colWidths = [];
        rows.forEach(row => {
            row.forEach((cell, colIndex) => {
                const len = cell.length;
                if (!colWidths[colIndex] || len > colWidths[colIndex]) {
                    colWidths[colIndex] = len;
                }
            });
        });

        // Ensure columns have a minimum width for the Markdown alignment indicator (at least 3 characters)
        const paddedWidths = colWidths.map(w => Math.max(w || 0, 3));

        let md = '';
        rows.forEach((row, rowIndex) => {
            // Header spacer row
            if (rowIndex === 1) {
                md += '|' + paddedWidths.map(w => '-'.repeat(w + 2)).join('|') + '|\n';
            }
            
            const cellStrings = row.map((cell, colIndex) => {
                const width = paddedWidths[colIndex];
                return ' ' + cell.padEnd(width) + ' ';
            });

            // Handle mismatched row columns (pad empty cells if necessary)
            if (cellStrings.length < paddedWidths.length) {
                for (let i = cellStrings.length; i < paddedWidths.length; i++) {
                    cellStrings.push(' '.repeat(paddedWidths[i] + 2));
                }
            }

            md += '|' + cellStrings.join('|') + '|\n';
        });

        mdOutput.value = md.trim();
    });

    btnToTable.addEventListener('click', () => {
        const mdText = mdOutput.value.trim();
        if (!mdText) {
            alert('Please input a Markdown table first.');
            return;
        }

        const lines = mdText.split('\n');
        const tsvRows = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            // Skip lines that do not represent rows (must have pipes)
            if (!trimmedLine.startsWith('|') || !trimmedLine.endsWith('|')) return;
            // Skip the header separator divider row (contains hyphens or colons only)
            if (/^[|:\-\s]+$/.test(trimmedLine)) return;

            // Split by pipe and remove outer empty elements
            const cells = trimmedLine.split('|').slice(1, -1).map(cell => cell.trim());
            tsvRows.push(cells.join('\t'));
        });

        rawInput.value = tsvRows.join('\n');
    });

    btnClear.addEventListener('click', () => {
        rawInput.value = '';
        mdOutput.value = '';
    });

    btnCopy.addEventListener('click', () => {
        const content = mdOutput.value;
        if (!content) return;
        
        navigator.clipboard.writeText(content).then(() => {
            const origText = btnCopy.innerHTML;
            btnCopy.innerHTML = `<i data-lucide="check"></i> Copied!`;
            lucide.createIcons();
            setTimeout(() => {
                btnCopy.innerHTML = origText;
                lucide.createIcons();
            }, 2000);
        });
    });
}

// ==========================================================================
// Local Privacy Diff Checker
// ==========================================================================
function initDiffChecker() {
    const originalTextarea = document.getElementById('diff-text-original');
    const modifiedTextarea = document.getElementById('diff-text-modified');
    const btnCompare = document.getElementById('btn-compare-diff');
    const btnClear = document.getElementById('btn-clear-diff');
    const outputContainer = document.getElementById('diff-rendered-output');

    btnCompare.addEventListener('click', () => {
        const original = originalTextarea.value;
        const modified = modifiedTextarea.value;
        const mode = document.querySelector('input[name="diff-mode"]:checked').value;

        if (!original && !modified) {
            alert('Please paste original or modified text to compare.');
            return;
        }

        outputContainer.innerHTML = '';

        if (mode === 'line') {
            // Line-by-line comparison using standard LCS
            const oldLines = original.split('\n');
            const newLines = modified.split('\n');
            const diffResult = diffLCS(oldLines, newLines);

            diffResult.forEach(item => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'diff-line';
                
                if (item.type === 'added') {
                    lineDiv.classList.add('added');
                    lineDiv.textContent = `+ ${item.val}`;
                } else if (item.type === 'removed') {
                    lineDiv.classList.add('removed');
                    lineDiv.textContent = `- ${item.val}`;
                } else {
                    lineDiv.textContent = `  ${item.val}`;
                }
                outputContainer.appendChild(lineDiv);
            });
        } else {
            // Word-by-word comparison using standard LCS on space boundaries
            const oldWords = tokenizeWords(original);
            const newWords = tokenizeWords(modified);
            const diffResult = diffLCS(oldWords, newWords);

            const diffSpanWrapper = document.createElement('div');
            diffSpanWrapper.style.whiteSpace = 'pre-wrap';

            diffResult.forEach(item => {
                const span = document.createElement('span');
                
                if (item.type === 'added') {
                    span.className = 'diff-word-added';
                    span.textContent = item.val;
                } else if (item.type === 'removed') {
                    span.className = 'diff-word-removed';
                    span.textContent = item.val;
                } else {
                    span.textContent = item.val;
                }
                diffSpanWrapper.appendChild(span);
            });
            outputContainer.appendChild(diffSpanWrapper);
        }
    });

    btnClear.addEventListener('click', () => {
        originalTextarea.value = '';
        modifiedTextarea.value = '';
        outputContainer.innerHTML = `<span class="placeholder-text">Press "Compare Texts Locally" to compute and view the visual diff here. All operations run entirely in-browser.</span>`;
    });

    // Helper: generic Longest Common Subsequence Diffing
    function diffLCS(arr1, arr2) {
        const m = arr1.length;
        const n = arr2.length;
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (arr1[i - 1] === arr2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        let i = m, j = n;
        const diff = [];
        
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
                diff.unshift({ type: 'unchanged', val: arr1[i - 1] });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                diff.unshift({ type: 'added', val: arr2[j - 1] });
                j--;
            } else {
                diff.unshift({ type: 'removed', val: arr1[i - 1] });
                i--;
            }
        }
        return diff;
    }

    // Helper: Split string by words and whitespace tokens (preserving everything)
    function tokenizeWords(str) {
        // Splitting by spaces or non-word chars but capturing delimiter boundaries
        return str.split(/(\s+|\b)/).filter(Boolean);
    }
}

// ==========================================================================
// BibTeX Citation Cleaner
// ==========================================================================
function initBibTeXCleaner() {
    const dropZone = document.getElementById('bibtex-drop-zone');
    const fileInput = document.getElementById('bibtex-file-input');
    const btnSelectFile = document.getElementById('btn-select-bibtex');
    const rawInput = document.getElementById('bibtex-raw-input');
    const cleanOutput = document.getElementById('bibtex-clean-output');
    const btnClean = document.getElementById('btn-clean-bibtex');
    const btnCopy = document.getElementById('btn-copy-bibtex');
    const btnDownload = document.getElementById('btn-download-bibtex');

    // Cleaner Option Elements
    const optAbstract = document.getElementById('bib-opt-strip-abstract');
    const optKeywords = document.getElementById('bib-opt-strip-keywords');
    const optExtras = document.getElementById('bib-opt-strip-extras');
    const optDoi = document.getElementById('bib-opt-keep-doi');
    const optWrap = document.getElementById('bib-opt-wrap-titles');
    const optDedup = document.getElementById('bib-opt-dedup');

    btnSelectFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            readBibFile(e.target.files[0]);
        }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            readBibFile(dt.files[0]);
        }
    });

    function readBibFile(file) {
        if (!file.name.endsWith('.bib') && file.type !== 'text/plain') {
            alert('Please upload a valid .bib file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            rawInput.value = event.target.result;
        };
        reader.readAsText(file);
    }

    btnClean.addEventListener('click', () => {
        const raw = rawInput.value.trim();
        if (!raw) {
            alert('Please paste BibTeX content or drop a .bib file first.');
            return;
        }

        const options = {
            stripAbstract: optAbstract.checked,
            stripKeywords: optKeywords.checked,
            stripExtras: optExtras.checked,
            keepDoi: optDoi.checked,
            wrapTitles: optWrap.checked,
            dedup: optDedup.checked
        };

        const cleaned = cleanBibTeX(raw, options);
        cleanOutput.value = cleaned;

        btnCopy.disabled = !cleaned;
        btnDownload.disabled = !cleaned;
    });

    btnCopy.addEventListener('click', () => {
        const content = cleanOutput.value;
        if (!content) return;
        
        navigator.clipboard.writeText(content).then(() => {
            const origText = btnCopy.innerHTML;
            btnCopy.innerHTML = `<i data-lucide="check"></i> Copied!`;
            lucide.createIcons();
            setTimeout(() => {
                btnCopy.innerHTML = origText;
                lucide.createIcons();
            }, 2000);
        });
    });

    btnDownload.addEventListener('click', () => {
        const content = cleanOutput.value;
        if (!content) return;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.download = `cleaned_citations_${Date.now()}.bib`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    // ----------------------------------------------------------------------
    // BibTeX Parsing & Cleaning Algorithm
    // ----------------------------------------------------------------------
    function cleanBibTeX(rawText, options) {
        let entries = [];
        let i = 0;
        
        while (i < rawText.length) {
            let index = rawText.indexOf('@', i);
            if (index === -1) break;
            
            let openBraceIndex = rawText.indexOf('{', index);
            if (openBraceIndex === -1) {
                i = index + 1;
                continue;
            }
            
            let type = rawText.substring(index + 1, openBraceIndex).trim().toLowerCase();
            
            // Handle comments, preamble, macros
            if (type === 'comment' || type === 'preamble' || type === 'string') {
                let endBrace = findClosingBrace(rawText, openBraceIndex);
                if (endBrace !== -1) {
                    entries.push({ type: type, raw: rawText.substring(index, endBrace + 1), isMeta: true });
                    i = endBrace + 1;
                } else {
                    i = openBraceIndex + 1;
                }
                continue;
            }
            
            let endBrace = findClosingBrace(rawText, openBraceIndex);
            if (endBrace === -1) {
                i = openBraceIndex + 1;
                continue;
            }
            
            let entryBody = rawText.substring(openBraceIndex + 1, endBrace);
            let firstComma = entryBody.indexOf(',');
            let citationKey = "";
            let fieldsString = "";
            
            if (firstComma !== -1) {
                citationKey = entryBody.substring(0, firstComma).trim();
                fieldsString = entryBody.substring(firstComma + 1);
            } else {
                citationKey = entryBody.trim();
            }
            
            let fields = parseBibTeXFields(fieldsString);
            entries.push({
                type: type,
                key: citationKey,
                fields: fields,
                raw: rawText.substring(index, endBrace + 1)
            });
            
            i = endBrace + 1;
        }

        // Deduplication
        if (options.dedup) {
            let seenKeys = new Set();
            let seenTitles = new Set();
            let seenDOIs = new Set();
            let uniqueEntries = [];
            
            for (let entry of entries) {
                if (entry.isMeta) {
                    uniqueEntries.push(entry);
                    continue;
                }
                
                let doi = entry.fields && entry.fields['doi'] ? entry.fields['doi'].toLowerCase().replace(/https?:\/\/doi.org\//, '').trim() : '';
                let title = entry.fields && entry.fields['title'] ? entry.fields['title'].toLowerCase().replace(/[\{\}]/g, '').replace(/\s+/g, ' ').trim() : '';
                let key = entry.key ? entry.key.trim() : '';
                
                let isDuplicate = false;
                if (doi && seenDOIs.has(doi)) isDuplicate = true;
                else if (title && seenTitles.has(title)) isDuplicate = true;
                else if (key && seenKeys.has(key)) isDuplicate = true;
                
                if (!isDuplicate) {
                    if (doi) seenDOIs.add(doi);
                    if (title) seenTitles.add(title);
                    if (key) seenKeys.add(key);
                    uniqueEntries.push(entry);
                }
            }
            entries = uniqueEntries;
        }
        
        // Re-construct and format BibTeX
        let outputText = "";
        for (let entry of entries) {
            if (entry.isMeta) {
                outputText += entry.raw + "\n\n";
                continue;
            }
            
            let cleanedFields = {};
            for (let key in entry.fields) {
                let lowKey = key.toLowerCase();
                
                if (lowKey === 'abstract' && options.stripAbstract) continue;
                if (lowKey === 'keywords' && options.stripKeywords) continue;
                
                const extraKeys = ['file', 'note', 'epub', 'url', 'issn', 'isbn'];
                if (extraKeys.includes(lowKey) && options.stripExtras) continue;
                
                if (lowKey === 'doi') {
                    if (options.keepDoi) {
                        // Keep
                    } else if (options.stripExtras) {
                        // Drop if not explicitly keeping and stripping extras
                        continue;
                    }
                }
                
                let val = entry.fields[key];
                if (lowKey === 'title' && options.wrapTitles) {
                    val = wrapCapitalizedTitleWords(val);
                }
                
                cleanedFields[key] = val;
            }
            
            outputText += `@${entry.type}{${entry.key},\n`;
            let fieldLines = [];
            for (let key in cleanedFields) {
                fieldLines.push(`  ${key} = {${cleanedFields[key]}}`);
            }
            outputText += fieldLines.join(",\n");
            outputText += `\n}\n\n`;
        }
        
        return outputText.trim();
    }

    function findClosingBrace(text, openBraceIndex) {
        let braceCount = 1;
        let inString = false;
        let escape = false;
        for (let j = openBraceIndex + 1; j < text.length; j++) {
            let char = text[j];
            if (escape) {
                escape = false;
                continue;
            }
            if (char === '\\') {
                escape = true;
                continue;
            }
            if (inString) {
                if (char === '"') inString = false;
                continue;
            }
            if (char === '"') {
                inString = true;
                continue;
            }
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return j;
                }
            }
        }
        return -1;
    }

    function parseBibTeXFields(fieldsString) {
        let fields = {};
        let i = 0;
        while (i < fieldsString.length) {
            let eq = fieldsString.indexOf('=', i);
            if (eq === -1) break;
            
            let name = fieldsString.substring(i, eq).trim();
            name = name.replace(/^[\s,]+|[\s,]+$/g, '');
            if (!name) {
                i = eq + 1;
                continue;
            }
            
            let valStart = eq + 1;
            while (valStart < fieldsString.length && /\s/.test(fieldsString[valStart])) {
                valStart++;
            }
            
            let value = "";
            let valEnd = valStart;
            if (fieldsString[valStart] === '{') {
                let endBrace = findClosingBrace(fieldsString, valStart);
                if (endBrace !== -1) {
                    value = fieldsString.substring(valStart + 1, endBrace);
                    valEnd = endBrace + 1;
                } else {
                    value = fieldsString.substring(valStart + 1);
                    valEnd = fieldsString.length;
                }
            } else if (fieldsString[valStart] === '"') {
                let inEscape = false;
                let endQuote = -1;
                for (let j = valStart + 1; j < fieldsString.length; j++) {
                    if (inEscape) { inEscape = false; continue; }
                    if (fieldsString[j] === '\\') { inEscape = true; continue; }
                    if (fieldsString[j] === '"') { endQuote = j; break; }
                }
                if (endQuote !== -1) {
                    value = fieldsString.substring(valStart + 1, endQuote);
                    valEnd = endQuote + 1;
                } else {
                    value = fieldsString.substring(valStart + 1);
                    valEnd = fieldsString.length;
                }
            } else {
                let nextComma = fieldsString.indexOf(',', valStart);
                if (nextComma !== -1) {
                    value = fieldsString.substring(valStart, nextComma).trim();
                    valEnd = nextComma + 1;
                } else {
                    value = fieldsString.substring(valStart).trim();
                    valEnd = fieldsString.length;
                }
            }
            
            value = value.replace(/\s+/g, ' ').trim();
            fields[name] = value;
            i = valEnd;
        }
        return fields;
    }

    function wrapCapitalizedTitleWords(title) {
        let words = title.split(/(\s+)/);
        let newWords = words.map((word, index) => {
            let trimmed = word.trim();
            if (!trimmed) return word;
            
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                return word;
            }
            
            if (/^[.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(trimmed)) {
                return word;
            }
            
            let alphaWord = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/g, '');
            let hasCapitals = false;
            
            if (alphaWord.length > 0) {
                let rest = alphaWord.substring(1);
                const lowerStopWords = ["A", "An", "The", "And", "But", "Or", "For", "Nor", "On", "In", "At", "To", "By", "Of", "With"];
                
                if (index === 0 || index === 2) {
                    // First word: wrap only if it has capitals beyond the first letter
                    hasCapitals = /[A-Z]/.test(rest);
                } else {
                    let isCapital = /[A-Z]/.test(alphaWord);
                    let isStopWord = lowerStopWords.includes(alphaWord);
                    hasCapitals = isCapital && !isStopWord;
                }
            }
            
            if (hasCapitals) {
                let trailingPunct = trimmed.substring(alphaWord.length);
                return `{${alphaWord}}${trailingPunct}`;
            }
            return word;
        });
        return newWords.join('');
    }
}

// ==========================================================================
// LLM Server Status Tester (Tauri Desktop Only)
// ==========================================================================
function initLLMTester() {
    const radioPreset = document.getElementsByName('llm-preset');
    const urlInput = document.getElementById('llm-url');
    const apikeyWrapper = document.getElementById('apikey-wrapper');
    const apikeyInput = document.getElementById('llm-key');
    const modelInput = document.getElementById('llm-test-model');
    const btnTest = document.getElementById('btn-test-llm');

    const statusCard = document.getElementById('llm-status-card');
    const statusIcon = document.getElementById('llm-status-icon');
    const statusTitle = document.getElementById('llm-status-title');
    const statusLatency = document.getElementById('llm-status-latency');
    const logOutput = document.getElementById('llm-log-output');
    const modelList = document.getElementById('llm-model-list');
    const corsTip = document.getElementById('cors-help-tip');

    const presets = {
        ollama: {
            url: "http://localhost:11434",
            modelPlaceholder: "e.g. llama3, leaving blank queries active models",
            requiresKey: false
        },
        openai: {
            url: "https://api.openai.com/v1",
            modelPlaceholder: "e.g. gpt-4o, leaving blank queries models list",
            requiresKey: true
        },
        custom: {
            url: "",
            modelPlaceholder: "e.g. custom-model",
            requiresKey: false
        }
    };

    radioPreset.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const config = presets[e.target.value];
            urlInput.value = config.url;
            modelInput.placeholder = config.modelPlaceholder;
            
            if (config.requiresKey) {
                apikeyWrapper.classList.remove('hidden');
            } else {
                apikeyWrapper.classList.add('hidden');
                apikeyInput.value = '';
            }
        });
    });

    btnTest.addEventListener('click', async () => {
        const selectedPreset = document.querySelector('input[name="llm-preset"]:checked').value;
        const baseUrl = urlInput.value.trim();
        const apiKey = apikeyInput.value.trim();

        if (!baseUrl) {
            alert('Please specify an API endpoint base URL');
            return;
        }

        btnTest.disabled = true;
        btnTest.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Testing Connection...`;
        lucide.createIcons();

        updateStatusUI('neutral', 'Testing...', 'Connecting to endpoint...');
        logOutput.textContent = `[INFO] Initializing connection test to ${baseUrl}...\n`;
        modelList.innerHTML = `<li class="empty-list-item">Testing connection...</li>`;
        corsTip.classList.add('hidden');

        const startTime = performance.now();
        let logText = `[INFO] Timestamp: ${new Date().toISOString()}\n`;
        logText += `[INFO] Preset: ${selectedPreset.toUpperCase()}\n`;
        logText += `[INFO] Endpoint: ${baseUrl}\n`;
        
        try {
            let isSuccessful = false;
            let latency = 0;
            let modelsFound = [];
            let statusText = '';

            const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

            if (isTauri) {
                const headers = { 'Content-Type': 'application/json' };
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }

                const testUrl = selectedPreset === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/models`;
                logText += `[TAURI] Routing connection request through native Rust backend (bypassing CORS restrictions)...\n`;
                logText += `[SEND] GET ${testUrl}\n`;
                logOutput.textContent = logText;

                try {
                    const invoke = window.__TAURI__.core.invoke;
                    const res = await invoke('test_llm_connection', {
                        url: testUrl,
                        method: 'GET',
                        headers: headers,
                        body: null
                    });
                    
                    latency = res.latency_ms;
                    logText += `[RECV] Status: ${res.status_code} (Success: ${res.success}) (${latency}ms)\n`;

                    if (res.success) {
                        isSuccessful = true;
                        const data = JSON.parse(res.body);
                        if (selectedPreset === 'ollama') {
                            modelsFound = data.models || [];
                            statusText = `Connected to Ollama`;
                            logText += `[SUCCESS] Retrieved ${modelsFound.length} local models from Ollama.\n`;
                        } else {
                            const items = data.data || [];
                            modelsFound = items.map(item => ({ name: item.id }));
                            statusText = `Connected`;
                            logText += `[SUCCESS] Retrieved ${modelsFound.length} available models from server.\n`;
                        }
                    } else {
                        logText += `[ERROR] Server returned non-success code: ${res.status_code}\n`;
                        logText += `[BODY] ${res.body}\n`;
                        statusText = `Error status: ${res.status_code}`;
                    }
                } catch (invokeError) {
                    logText += `[TAURI ERROR] IPC call failed: ${invokeError}\n`;
                    throw new Error(invokeError);
                }
            } else {
                if (selectedPreset === 'ollama') {
                    logText += `[INFO] Checking Ollama status via API...\n`;
                    logOutput.textContent = logText;
                    logText += `[SEND] GET ${baseUrl}/api/tags\n`;
                    logOutput.textContent = logText;
                    
                    const response = await fetch(`${baseUrl}/api/tags`, {
                        method: 'GET',
                        mode: 'cors'
                    });

                    latency = Math.round(performance.now() - startTime);
                    logText += `[RECV] Status: ${response.status} ${response.statusText} (${latency}ms)\n`;

                    if (response.ok) {
                        const data = await response.json();
                        isSuccessful = true;
                        modelsFound = data.models || [];
                        logText += `[SUCCESS] Retrieved ${modelsFound.length} local models from Ollama.\n`;
                        statusText = `Connected to Ollama`;
                    } else {
                        logText += `[ERROR] Ollama returned non-200 status code: ${response.status}\n`;
                        statusText = `Error status: ${response.status}`;
                    }
                } else {
                    logText += `[INFO] Connecting to OpenAI compatible endpoint...\n`;
                    logOutput.textContent = logText;
                    
                    const headers = { 'Content-Type': 'application/json' };
                    if (apiKey) {
                        headers['Authorization'] = `Bearer ${apiKey}`;
                        logText += `[INFO] Attaching Authorization Bearer Header\n`;
                    }

                    const testUrl = `${baseUrl}/models`;
                    logText += `[SEND] GET ${testUrl}\n`;
                    logOutput.textContent = logText;

                    const response = await fetch(testUrl, {
                        method: 'GET',
                        headers: headers,
                        mode: 'cors'
                    });

                    latency = Math.round(performance.now() - startTime);
                    logText += `[RECV] Status: ${response.status} ${response.statusText} (${latency}ms)\n`;

                    if (response.ok) {
                        const data = await response.json();
                        isSuccessful = true;
                        const items = data.data || [];
                        modelsFound = items.map(item => ({ name: item.id }));
                        logText += `[SUCCESS] Retrieved ${modelsFound.length} available models from server.\n`;
                        statusText = `Connected`;
                    } else {
                        logText += `[ERROR] Server returned error response: ${response.status}\n`;
                        statusText = `Error status: ${response.status}`;
                    }
                }
            }

            if (isSuccessful) {
                updateStatusUI('success', statusText, `Latency: ${latency}ms`);
                renderModelsList(modelsFound);
            } else {
                updateStatusUI('warning', statusText, `Latency: ${latency}ms`);
                modelList.innerHTML = `<li class="empty-list-item">No models listed (Response: ${statusText}).</li>`;
            }

        } catch (error) {
            const totalTime = Math.round(performance.now() - startTime);
            logText += `[EXCEPTION] Connection failed after ${totalTime}ms.\n`;
            logText += `[EXCEPTION] Details: ${error.message}\n`;
            logOutput.textContent = logText;

            updateStatusUI('danger', 'Connection Failed', `Failed after ${totalTime}ms`);
            modelList.innerHTML = `<li class="empty-list-item text-danger">Verification failed. Check endpoint parameters.</li>`;
            
            if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                corsTip.classList.remove('hidden');
            }
        } finally {
            btnTest.disabled = false;
            btnTest.innerHTML = `<i data-lucide="zap"></i> Run Connection Test`;
            lucide.createIcons();
            logOutput.textContent = logText;
        }
    });

    function updateStatusUI(type, title, subtitle) {
        statusCard.className = 'status-summary-card';
        statusCard.classList.add(`status-${type}`);

        let iconName = 'help-circle';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'warning') iconName = 'alert-circle';
        if (type === 'danger') iconName = 'x-circle';

        statusIcon.setAttribute('data-lucide', iconName);
        statusTitle.textContent = title;
        statusLatency.textContent = subtitle;
        lucide.createIcons();
    }

    function renderModelsList(models) {
        populateChatModels(models);
        if (!models || models.length === 0) {
            modelList.innerHTML = `<li class="empty-list-item">No models found in active server configuration.</li>`;
            return;
        }

        modelList.innerHTML = '';
        models.forEach(model => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'model-name';
            nameSpan.textContent = model.name || model.id || 'Unnamed Model';

            const tagSpan = document.createElement('span');
            tagSpan.className = 'model-tag';
            tagSpan.textContent = model.details && model.details.parameter_size ? model.details.parameter_size : 'active';

            li.appendChild(nameSpan);
            li.appendChild(tagSpan);
            modelList.appendChild(li);
        });
    }

    // ----------------------------------------------------------------------
    // Interactive Chat Test
    // ----------------------------------------------------------------------
    const chatModelSelect = document.getElementById('llm-chat-model');
    const chatTranscript = document.getElementById('llm-chat-transcript');
    const chatEmptyState = document.getElementById('llm-chat-empty');
    const chatInput = document.getElementById('llm-chat-input');
    const btnSendChat = document.getElementById('btn-send-chat');
    const btnClearChat = document.getElementById('btn-clear-chat');
    const chatStatus = document.getElementById('llm-chat-status');

    let chatHistory = [];
    let chatBusy = false;

    btnSendChat.addEventListener('click', () => sendChatMessage());

    btnClearChat.addEventListener('click', () => {
        chatHistory = [];
        chatTranscript.innerHTML = '';
        chatTranscript.appendChild(chatEmptyState);
        setChatStatus('Conversation cleared. Send a new message to test again.');
        lucide.createIcons();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    function setChatStatus(text) {
        chatStatus.textContent = text;
    }

    function populateChatModels(models) {
        const previous = chatModelSelect.value;
        chatModelSelect.innerHTML = '<option value="">Use model from configuration</option>';
        (models || []).forEach(model => {
            const name = model.name || model.id;
            if (!name) return;
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            chatModelSelect.appendChild(opt);
        });
        if (previous && Array.from(chatModelSelect.options).some(o => o.value === previous)) {
            chatModelSelect.value = previous;
        }
    }

    function appendChatMessage(role, content) {
        if (chatEmptyState.parentNode === chatTranscript) {
            chatTranscript.removeChild(chatEmptyState);
        }

        const wrapper = document.createElement('div');
        wrapper.className = `chat-message chat-${role}`;

        const header = document.createElement('div');
        header.className = 'chat-message-role';
        header.textContent = role === 'user' ? 'You' : 'Assistant';

        const body = document.createElement('div');
        body.className = 'chat-message-body';
        body.textContent = content;

        wrapper.appendChild(header);
        wrapper.appendChild(body);
        chatTranscript.appendChild(wrapper);
        chatTranscript.scrollTop = chatTranscript.scrollHeight;
        return wrapper;
    }

    async function sendChatMessage() {
        if (chatBusy) return;

        const prompt = chatInput.value.trim();
        if (!prompt) {
            setChatStatus('Type a message before sending.');
            return;
        }

        const selectedPreset = document.querySelector('input[name="llm-preset"]:checked').value;
        const baseUrl = urlInput.value.trim().replace(/\/+$/, '');
        const apiKey = apikeyInput.value.trim();
        const model = chatModelSelect.value.trim() || modelInput.value.trim();

        if (!baseUrl) {
            setChatStatus('Specify an API endpoint base URL in the configuration panel first.');
            return;
        }
        if (!model) {
            setChatStatus('No model selected. Pick one from the dropdown, or type a model name in the configuration panel.');
            return;
        }

        const isOllama = selectedPreset === 'ollama';
        const chatUrl = isOllama ? `${baseUrl}/api/chat` : `${baseUrl}/chat/completions`;

        chatHistory.push({ role: 'user', content: prompt });
        appendChatMessage('user', prompt);
        chatInput.value = '';

        chatBusy = true;
        btnSendChat.disabled = true;
        btnSendChat.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Sending...`;
        lucide.createIcons();

        const pending = appendChatMessage('assistant', 'Waiting for response...');
        const pendingBody = pending.querySelector('.chat-message-body');
        const pendingRole = pending.querySelector('.chat-message-role');
        setChatStatus(`POST ${chatUrl} (model: ${model})`);

        const startTime = performance.now();

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const payload = { model: model, messages: chatHistory, stream: false };

            let rawBody, statusCode, ok, latency;
            const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

            if (isTauri) {
                const invoke = window.__TAURI__.core.invoke;
                const res = await invoke('test_llm_connection', {
                    url: chatUrl,
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                rawBody = res.body;
                statusCode = res.status_code;
                ok = res.success;
                latency = res.latency_ms;
            } else {
                const response = await fetch(chatUrl, {
                    method: 'POST',
                    headers: headers,
                    mode: 'cors',
                    body: JSON.stringify(payload)
                });
                rawBody = await response.text();
                statusCode = response.status;
                ok = response.ok;
                latency = Math.round(performance.now() - startTime);
            }

            if (!ok) {
                throw new Error(`Server returned HTTP ${statusCode}: ${rawBody.slice(0, 400)}`);
            }

            const data = JSON.parse(rawBody);
            let reply = '';
            if (isOllama) {
                reply = (data.message && data.message.content) || '';
            } else {
                const choice = (data.choices || [])[0] || {};
                reply = (choice.message && choice.message.content) || choice.text || '';
            }

            if (!reply) {
                reply = `[No message content in response]\n${rawBody.slice(0, 800)}`;
            }

            chatHistory.push({ role: 'assistant', content: reply });
            pendingBody.textContent = reply;

            const meta = document.createElement('span');
            meta.className = 'chat-message-meta';
            meta.textContent = `${model} · ${latency}ms`;
            pendingRole.appendChild(meta);

            setChatStatus(`Response received in ${latency}ms (HTTP ${statusCode}).`);
        } catch (error) {
            const totalTime = Math.round(performance.now() - startTime);
            pending.classList.remove('chat-assistant');
            pending.classList.add('chat-error');
            pendingRole.textContent = 'Error';
            pendingBody.textContent = error.message || String(error);
            setChatStatus(`Request failed after ${totalTime}ms.`);

            // Drop the unanswered turn so a retry does not stack duplicate prompts.
            chatHistory.pop();

            if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                corsTip.classList.remove('hidden');
            }
        } finally {
            chatBusy = false;
            btnSendChat.disabled = false;
            btnSendChat.innerHTML = `<i data-lucide="send"></i> Send`;
            lucide.createIcons();
            chatTranscript.scrollTop = chatTranscript.scrollHeight;
        }
    }
}

// ==========================================================================
// LLM JSON Output Fixer
// ==========================================================================
function initJSONFixer() {
    const rawInput = document.getElementById('json-raw-input');
    const cleanOutput = document.getElementById('json-clean-output');
    const btnFix = document.getElementById('btn-fix-json');
    const btnClear = document.getElementById('btn-clear-json-input');
    const btnCopy = document.getElementById('btn-copy-json');

    btnFix.addEventListener('click', () => {
        const rawText = rawInput.value.trim();
        if (!rawText) {
            alert('Please paste some JSON output first.');
            return;
        }

        const repaired = repairTruncatedJSON(rawText);
        cleanOutput.value = repaired;
        btnCopy.disabled = !repaired;
    });

    btnClear.addEventListener('click', () => {
        rawInput.value = '';
        cleanOutput.value = '';
        btnCopy.disabled = true;
    });

    btnCopy.addEventListener('click', () => {
        const content = cleanOutput.value;
        if (!content) return;

        navigator.clipboard.writeText(content).then(() => {
            const origText = btnCopy.innerHTML;
            btnCopy.innerHTML = `<i data-lucide="check"></i> Copied!`;
            lucide.createIcons();
            setTimeout(() => {
                btnCopy.innerHTML = origText;
                lucide.createIcons();
            }, 2000);
        });
    });

    // ----------------------------------------------------------------------
    // Smart JSON Output Repair & Format Heuristic
    // ----------------------------------------------------------------------
    function repairTruncatedJSON(raw) {
        let text = raw.trim();
        if (!text) return "";

        // 1. Close open strings if truncated inside a string value
        let inString = false;
        let escape = false;
        let quoteChar = '"';
        let stack = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (char === '\\') {
                escape = true;
                continue;
            }
            if (inString) {
                if (char === quoteChar) {
                    inString = false;
                }
                continue;
            }
            if (char === '"' || char === "'") {
                inString = true;
                quoteChar = char;
                continue;
            }
            if (char === '{' || char === '[') {
                stack.push(char);
            } else if (char === '}') {
                if (stack[stack.length - 1] === '{') {
                    stack.pop();
                }
            } else if (char === ']') {
                if (stack[stack.length - 1] === '[') {
                    stack.pop();
                }
            }
        }

        if (inString) {
            text += quoteChar;
        }

        // 2. Remove trailing commas before braces or brackets
        text = text.replace(/,\s*([}\]])/g, '$1');

        // 3. Balance braces/brackets stack
        let balanceText = text;
        const subStack = [...stack];
        while (subStack.length > 0) {
            const open = subStack.pop();
            if (open === '{') balanceText += '}';
            else if (open === '[') balanceText += ']';
        }

        // Try direct parsing of balanced text
        try {
            const parsed = JSON.parse(balanceText);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            // Rollback strategy: if parse fails, truncate back to last valid comma/brace
            // to throw away unfinished properties/items and re-balance
            let lastComma = text.lastIndexOf(',');
            let lastOpenBrace = text.lastIndexOf('{');
            let lastOpenBracket = text.lastIndexOf('[');
            let cutoff = Math.max(lastComma, lastOpenBrace, lastOpenBracket);

            if (cutoff > 0) {
                let rollbackText = text.substring(0, cutoff).trim();
                if (rollbackText.endsWith(',')) {
                    rollbackText = rollbackText.substring(0, rollbackText.length - 1).trim();
                }

                // Recalculate stack for rollback text
                let newStack = [];
                let newInString = false;
                let newEscape = false;
                for (let i = 0; i < rollbackText.length; i++) {
                    const char = rollbackText[i];
                    if (newEscape) { newEscape = false; continue; }
                    if (char === '\\') { newEscape = true; continue; }
                    if (newInString) {
                        if (char === '"') newInString = false;
                        continue;
                    }
                    if (char === '"') { newInString = true; continue; }
                    if (char === '{' || char === '[') {
                        newStack.push(char);
                    } else if (char === '}') {
                        if (newStack[newStack.length - 1] === '{') newStack.pop();
                    } else if (char === ']') {
                        if (newStack[newStack.length - 1] === '[') newStack.pop();
                    }
                }

                while (newStack.length > 0) {
                    const open = newStack.pop();
                    if (open === '{') rollbackText += '}';
                    else if (open === '[') rollbackText += ']';
                }

                try {
                    const parsed = JSON.parse(rollbackText);
                    return JSON.stringify(parsed, null, 2);
                } catch (err) {
                    return balanceText; // Return first best effort if rollback fails
                }
            }
            return balanceText;
        }
    }
}
