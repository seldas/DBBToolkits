# DBBtoolkits — Scientific Research Tool Suite

[![Web App](https://img.shields.io/badge/Web%20App-Live-brightgreen)](https://seldas.github.io/DBBToolkits/)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Windows%20(Tauri)-blue)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**DBBtoolkits** is a lightweight suite of high-performance scientific tools designed to streamline daily research workflows. All tools run **100% client-side in your browser** with zero installation and zero data uploaded to any server—ensuring maximum privacy for your papers, figures, citations, and data. (An optional **Tauri v2** desktop build is also supported for local CORS-free LLM testing.)

---

## 🚀 Use Online (No Installation Required)

Open the live web app directly in any modern browser:

👉 **[https://seldas.github.io/DBBToolkits/](https://seldas.github.io/DBBToolkits/)**

* Works on Windows, macOS, and Linux without downloading or installing any executable.
* All processing (figure preparation, panel composing, colorblind simulation, BibTeX cleaning, diff checking, QR generation) happens locally in your browser memory.
* *(Optional)* The **LLM Server Connection Tester** is hidden on the web version due to browser CORS / Mixed Content restrictions and is available when running the local Tauri desktop build (see [Developer Guide](#-developer-guide--local-compilation)).

---

## 🛠️ Core Toolkits

### Figure & Image
1. **📷 Figure Prep (DPI, Metadata & Crop)**
   * Converts PNG/JPEG to **72, 150, 300, or 600 DPI** at the byte level (zero re-compression loss).
   * Strips EXIF, XMP, and PNG text metadata blocks (`tEXt`/`iTXt`/`zTXt`/`eXIf`) for double-blind review safety.
   * Supports **auto-cropping** whitespace/transparent margins and **SVG rasterization** to high-DPI PNG.
2. **🧩 Figure Panel Composer**
   * Combines multiple subfigures into aligned grids (`Auto`, `1×N`, `2×2`, etc.) with customizable spacing and `(a)`, `(b)`, `(c)` labels.
   * Exports directly as a **300 or 600 DPI** PNG.
3. **👁️ Colorblind & Grayscale Print Check**
   * Simulates **Deuteranopia**, **Protanopia**, **Tritanopia**, and **Grayscale Print** side-by-side locally in-browser, with one-click comparison sheet export.

### Writing & Citations
4. **🔠 BibTeX Citation Cleaner**
   * Strips redundant fields (`abstract`, `keywords`, `note`, `file`, `epub`, `url`, `issn`) while preserving `DOI`.
   * Protects capitalized words in title blocks with curly braces (e.g., `{CNN}`, `{GPT-3}`) and removes duplicates.
5. **🔍 Local Privacy Diff Checker**
   * Side-by-side line-by-line and word-by-word comparison of abstracts, drafts, or prompts 100% locally.

### Utilities
6. **📱 QR Code Generator**
   * Generates high-resolution PNG QR codes with customizable dimensions, error correction levels (L, M, Q, H), and colors.

---

## 💻 Developer Guide & Local Compilation

If you want to contribute, modify the code, or build the application from source:

### Prerequisites

1. **Node.js** (v18+)
2. **Rust Toolchain**:
   * Windows: Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select *Desktop development with C++*) and [Rustup](https://rustup.rs/).

### Setup & Development

Clone the repository and install dependencies:

```powershell
# Clone the repository
git clone https://github.com/seldas/DBBToolkits.git
cd DBBToolkits

# Install dependencies
npm install
```

To run or build the **web version**:

```powershell
# Start web dev server
npm run dev

# Build static web bundle into dist/
npm run build
```

To run or package the optional **Tauri desktop version** locally:

```powershell
npm run tauri dev
npm run tauri build
```

---

## 🔒 Privacy & Security

All computations in DBBtoolkits occur locally on your machine.
* **No Telemetry**: We do not collect analytics, logs, or usage behaviors.
* **No Cloud Processing**: Your figures, BibTeX databases, and text comparisons never leave your computer.
* **Offline Ready**: The tool suite functions completely without an active internet connection.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
