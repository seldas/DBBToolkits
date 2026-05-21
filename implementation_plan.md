# Implementation Plan - Transition to Tauri Desktop App (Tauri v2)

This plan transitions `DBBtoolkits` from a browser-based Single Page App (Vite + Vanilla CSS) to a desktop-native application using **Tauri v2**. 

Tauri wraps our existing high-performance frontend in a native OS webview using a lightweight Rust backend. This enables a standalone desktop experience, local offline operation, and **bypasses browser CORS restrictions** when testing local LLM servers.

---

## User Review Required

### Prerequisites: Rust Compiler & Build Tools

Since the host environment does not currently have Cargo/Rust installed, you will need to perform a one-time setup of the Rust toolchain to compile and run the desktop app. We will configure all project files in this workspace so that you can compile the app immediately after these steps:

1. **Install Visual Studio C++ Build Tools** (Required for Windows development):
   * Download the Visual Studio Installer.
   * Select **Desktop development with C++** workload.
   * Install and restart your computer if prompted.
2. **Install Rust**:
   * Download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs/).
   * Choose the default installation option (Option 1).
3. **Verify Installation**:
   * Open a new terminal window and verify cargo is ready:
     ```powershell
     cargo --version
     ```

Once you have completed these steps, you can run the app in desktop development mode:
```powershell
npm run tauri dev
```

---

## Proposed Changes

### 1. Configuration & Dependency Layer

#### [MODIFY] [package.json](file:///d:/Coding/DBBToolkits/package.json)
* Add `@tauri-apps/cli` to `devDependencies` and `@tauri-apps/api` to `dependencies`.
* Add script shortcuts:
  * `"tauri": "tauri"`
  * `"tauri:dev": "tauri dev"`
  * `"tauri:build": "tauri build"`

#### [NEW] `src-tauri/Cargo.toml`
* Define Rust packages and dependencies (`tauri`, `serde`, `serde_json`, `reqwest`, `tokio`).
* Configure the static library output for Tauri compilation.

#### [NEW] `src-tauri/tauri.conf.json`
* Core desktop wrapper configuration:
  * Set `devUrl` to `http://localhost:5173`.
  * Set `frontendDist` to `../dist`.
  * Configure build commands (`npm run build` and `npm run dev`).
  * Enable global tauri injection: `"app": { "withGlobalTauri": true }` to easily expose Tauri APIs to our ESM javascript.

#### [NEW] `src-tauri/src/main.rs`
* Entry point wrapper calling the lib runner.

#### [NEW] `src-tauri/src/lib.rs`
* Core Rust backend logic. Implements the `test_llm_connection` command which fetches LLM endpoints from the Rust thread, bypassing browser CORS restrictions entirely.

#### [NEW] `src-tauri/capabilities/default.json`
* Tauri v2 permission mapping. Grants the frontend permission to execute default commands and access the window.

#### [NEW] Default Icons (Placeholder icons generated inside `src-tauri/icons/` so Tauri can compile).

### 2. Frontend Application Layer

#### [MODIFY] [app.js](file:///d:/Coding/DBBToolkits/app.js)
* Update `initLLMTester` to detect if the app is running in a Tauri context (`window.__TAURI__` is defined).
* If Tauri is detected, call the backend Rust command `test_llm_connection` using `window.__TAURI__.core.invoke`.
* If running in a normal browser, fallback gracefully to standard browser `fetch` (so the browser-based Vite preview continues to work).

---

## Verification Plan

### Automated & Compilation Checks
* Run `npm run build` to verify frontend compiling is healthy.
* Run `npx tauri info` to verify Tauri config files are valid.

### Manual Verification
* Once Rust is installed, compile and launch:
  ```powershell
  npm run tauri dev
  ```
* Verify:
  * The app loads inside a native OS window instead of a web browser.
  * Launch the **LLM Toolkits** screen and test connection to a local Ollama server (`http://localhost:11434`). It should connect successfully without any CORS errors.
  * Verify other tools (QR Code, DPI Converter, Diff, Table, BibTeX) still function offline inside the desktop window.