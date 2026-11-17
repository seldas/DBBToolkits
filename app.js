import QRCode from 'qrcode';
import { refreshIcons } from './src/icons.js';
import { initFigurePrep } from './src/figure/figurePrep.js';
import { initPanelComposer } from './src/figure/panelComposer.js';
import { initAccessibilitySim } from './src/figure/accessibilitySim.js';
import { extractClipboardImageFile } from './src/figure/figureBridge.js';
import { cleanBibTeX } from './src/writing/bibtexCleaner.js';

/* ==========================================================================
   DBBtoolkits Core Application Logic (Expanded Version)
   ========================================================================== */

let activeScreenId = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize core system and utilities
    refreshIcons();
    syncAppVersion();
    initNavigation();
    initTheme();
    initAccordions();

    // 2. Initialize tools
    initQRGenerator();
    const a11yApi = initAccessibilitySim();
    const panelApi = initPanelComposer({
        onSendToAccessibility: async (file) => {
            navigateTo('accessibility');
            await a11yApi.handleFile(file);
        },
    });
    const figurePrepApi = initFigurePrep({
        onSendToPanel: async (files) => {
            navigateTo('panel');
            await panelApi.addFiles(files);
        },
        onSendToAccessibility: async (file) => {
            navigateTo('accessibility');
            await a11yApi.handleFile(file);
        },
    });
    initImagePasteHandler({ figurePrepApi, panelApi, a11yApi });
    initLauncher();

    initDiffChecker();
    initBibTeXCleaner();

    if (isTauriRuntime()) {
        const navLlm = document.getElementById('nav-llm');
        const cardLlm = document.getElementById('card-llm');
        if (navLlm) navLlm.style.display = '';
        if (cardLlm) cardLlm.style.display = '';
        initLLMTester();
    }
});

function syncAppVersion() {
    const el = document.getElementById('app-version');
    if (el && typeof __APP_VERSION__ !== 'undefined') {
        el.textContent = `v${__APP_VERSION__}`;
    }
}

function initImagePasteHandler({ figurePrepApi, panelApi, a11yApi }) {
    document.addEventListener('paste', async (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        const file = extractClipboardImageFile(e);
        if (!file) return;

        if (activeScreenId === 'dpi') {
            e.preventDefault();
            await figurePrepApi.handleFiles([file]);
        } else if (activeScreenId === 'panel') {
            e.preventDefault();
            await panelApi.addFiles([file]);
        } else if (activeScreenId === 'accessibility') {
            e.preventDefault();
            await a11yApi.handleFile(file);
        }
    });
}

// ==========================================================================
// Spotlight / Command Launcher Dashboard
// ==========================================================================
function initLauncher() {
    const searchInput = document.getElementById('launcher-search');
    const listEl = document.getElementById('launcher-list');
    const emptyEl = document.getElementById('launcher-empty');
    if (!searchInput || !listEl) return;

    const items = Array.from(listEl.querySelectorAll('.launcher-item'));

    function getVisibleItems() {
        return items.filter((item) => {
            if (item.id === 'card-llm' && !isTauriRuntime()) return false;
            return !item.classList.contains('hidden');
        });
    }

    function setSelected(targetItem) {
        items.forEach((item) => item.classList.remove('selected'));
        if (targetItem) {
            targetItem.classList.add('selected');
            targetItem.scrollIntoView({ block: 'nearest' });
        }
    }

    function filterItems() {
        const q = searchInput.value.trim().toLowerCase();
        let firstVisible = null;
        let visibleCount = 0;

        items.forEach((item) => {
            if (item.id === 'card-llm' && !isTauriRuntime()) {
                item.classList.add('hidden');
                return;
            }
            const haystack = `${item.textContent} ${item.dataset.keywords || ''}`.toLowerCase();
            const match = !q || haystack.includes(q);
            item.classList.toggle('hidden', !match);
            if (match) {
                visibleCount++;
                if (!firstVisible) firstVisible = item;
            }
        });

        if (emptyEl) emptyEl.classList.toggle('hidden', visibleCount > 0);
        setSelected(firstVisible);
    }

    items.forEach((item) => {
        item.addEventListener('click', () => {
            const target = item.dataset.screen;
            if (target) navigateTo(target);
        });
        item.addEventListener('mouseenter', () => setSelected(item));
    });

    searchInput.addEventListener('input', filterItems);

    searchInput.addEventListener('keydown', (e) => {
        const visible = getVisibleItems();
        if (visible.length === 0) return;

        const currentIdx = Math.max(0, visible.findIndex((el) => el.classList.contains('selected')));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected(visible[(currentIdx + 1) % visible.length]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected(visible[(currentIdx - 1 + visible.length) % visible.length]);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const active = visible[currentIdx];
            if (active?.dataset.screen) navigateTo(active.dataset.screen);
        } else if (e.key === 'Escape') {
            if (searchInput.value) {
                searchInput.value = '';
                filterItems();
            } else {
                searchInput.blur();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        // Ctrl+K / Cmd+K opens Dashboard command palette from anywhere
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            navigateTo('dashboard');
            searchInput.focus();
            searchInput.select();
            return;
        }

        const tag = document.activeElement?.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        if (isTyping) return;

        if (e.key === '/') {
            e.preventDefault();
            navigateTo('dashboard');
            searchInput.focus();
            return;
        }

        if (activeScreenId === 'dashboard') {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const visible = getVisibleItems();
                if (visible.length === 0) return;
                e.preventDefault();
                const currentIdx = Math.max(0, visible.findIndex((el) => el.classList.contains('selected')));
                const nextIdx = e.key === 'ArrowDown'
                    ? (currentIdx + 1) % visible.length
                    : (currentIdx - 1 + visible.length) % visible.length;
                setSelected(visible[nextIdx]);
                return;
            }

            if (e.key === 'Enter') {
                const visible = getVisibleItems();
                const active = visible.find((el) => el.classList.contains('selected')) || visible[0];
                if (active?.dataset.screen) {
                    e.preventDefault();
                    navigateTo(active.dataset.screen);
                }
                return;
            }

            const matched = items.find((el) => el.dataset.shortcut === e.key && isScreenAvailable(el.dataset.screen));
            if (matched?.dataset.screen) {
                e.preventDefault();
                navigateTo(matched.dataset.screen);
            }
        }
    });
}

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
        
        refreshIcons();
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
        title: "Figure Prep (DPI, Metadata & Crop)",
        description: "Set 300/600 DPI, strip EXIF/author metadata for double-blind review, auto-crop margins, and rasterize SVG."
    },
    panel: {
        title: "Figure Panel Composer",
        description: "Arrange multiple subfigures into clean grids with (a), (b), (c) labels and export at 300/600 DPI."
    },
    accessibility: {
        title: "Colorblind & Grayscale Print Check",
        description: "Simulate Deuteranopia, Protanopia, Tritanopia, and grayscale print appearance locally in your browser."
    },
    diff: {
        title: "Local Privacy Diff Checker",
        description: "Compare text versions (abstracts, code, or prompts) safely in your browser without transmitting details."
    },
    bibtex: {
        title: "BibTeX Citation Cleaner",
        description: "Clean BibTeX databases, deduplicate records, strip optional keys, and safeguard proper noun capitalization."
    },
    llm: {
        title: "LLM Server Connection Tester",
        description: "Test connectivity, latency, available models, and chat responses on local or LAN LLM servers."
    }
};

function isScreenAvailable(screenId) {
    if (!pages[screenId]) return false;
    if (screenId === 'llm' && !isTauriRuntime()) return false;
    return true;
}

function initNavigation() {
    const hash = window.location.hash.substring(1);
    if (hash && isScreenAvailable(hash)) {
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
    if (!isScreenAvailable(screenId)) {
        screenId = 'dashboard';
    }

    activeScreenId = screenId;
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

if (typeof window !== 'undefined') {
    window.navigateTo = navigateTo;
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
        refreshIcons();

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
                refreshIcons();

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
// Figure Prep is initialized via ./src/figure/figurePrep.js

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
            refreshIcons();
            setTimeout(() => {
                btnCopy.innerHTML = origText;
                refreshIcons();
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
        refreshIcons();

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
            refreshIcons();
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
        refreshIcons();
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
        refreshIcons();
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
        refreshIcons();

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
            meta.textContent = `${model} Â· ${latency}ms`;
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
            refreshIcons();
            chatTranscript.scrollTop = chatTranscript.scrollHeight;
        }
    }
}
