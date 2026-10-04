# Live-Transgen (TransGen)

AAMVA-compliant driver's license / ID barcode generator — **PDF417 2D** barcode plus **Code 128 1D** barcode (Inventory Control Number), with a per-state generator UI, batch (CSV) mode, and magnetic-stripe data.

> Repo root is this folder (`Live-Transgen/Live-Transgen`). The outer `Live-Transgen/` folder is just a download wrapper — always run `git` and `pnpm` commands from here.
>
> **How to use the commands below:** copy a whole block, paste it into your terminal, press `Enter`. Each block can be pasted **all at once** — no need to go line by line.

```text
Live-Transgen/
└── Live-Transgen/            ← repo root (this README lives here)
    ├── artifacts/transgen/   ← the TransGen web app (Vite 7 + React 19)
    ├── attached_assets/      ← reference TransGen sources
    ├── scripts/              ← workspace utility scripts
    ├── lib/                  ← shared workspace libraries
    └── render.yaml           ← Render static-site blueprint
```

---

## Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Node.js | 22+ (repo targets 24) | `node --version` | https://nodejs.org |
| pnpm | 10.x | `pnpm --version` | `npm install -g pnpm@10.34.5` |
| Git | any recent | `git --version` | https://git-scm.com |

> Verified with Node `v22.23.2` + pnpm `10.34.5` on Windows.

---

## 1. Clone & install (first time only — paste all at once)

```powershell
git clone https://github.com/mprime3310/trangen.git
cd trangen            # repo root (contains pnpm-workspace.yaml)
pnpm install
```

---

## 2. Run it live (development server)

The dev server **requires two environment variables** (`vite.config.ts` throws at startup if either is missing):

| Variable | Meaning | Dev value |
|----------|---------|-----------|
| `PORT` | port the dev server listens on | `5173` |
| `BASE_PATH` | Vite `base` (URL prefix the app is served from) | `/` |

### Windows (PowerShell) — copy, paste all 4 lines at once, press Enter

```powershell
cd 'c:\Users\mprim\Downloads\Live-Transgen\Live-Transgen\artifacts\transgen'
$env:PORT='5173'
$env:BASE_PATH='/'
pnpm run dev
```

> Already cloned the repo to a different folder? Replace the first line with your own path, e.g. `cd '.\artifacts\transgen'` (run from the repo root).

### macOS / Linux (bash)

```bash
cd artifacts/transgen
PORT=5173 BASE_PATH=/ pnpm run dev
```

Then open **http://localhost:5173/** in your browser. Keep that terminal open while using the app — `Ctrl+C` stops the server.

The server binds to `0.0.0.0`, so other devices on your LAN can also reach it, e.g. `http://<your-lan-ip>:5173/`.

### If port 5173 is busy (paste all at once)

```powershell
cd 'c:\Users\mprim\Downloads\Live-Transgen\Live-Transgen\artifacts\transgen'
$env:PORT='8080'
$env:BASE_PATH='/'
pnpm run dev
# → http://localhost:8080/
```

---

## 3. Using the app

1. **Single Barcode tab** — fill in (or auto-populate) the DL fields, pick a state, then press **Generate** (or `Ctrl+S`).
   - **2D panel** → PDF417 barcode (trimmed, variable-length AAMVA payload).
   - **1D panel** → Code 128 barcode of the **ICN** (Inventory Control Number).
   - The ICN is generated fresh on every run — type your own to pin it, clear it to resume auto-generation.
   - **Settings → Auto-populate ID Numbers** regenerates both ID number and ICN on each run.
2. **Multiple Barcodes tab** — paste CSV (or use the example) and generate a batch. Rows without an `icn` column get one generated per row.
3. Each panel has a **download** button for the rendered PNG.

---

## 4. Production build & preview

```powershell
cd '.\artifacts\transgen'
$env:PORT = '5173'
$env:BASE_PATH = '/'
pnpm run build
```

Output goes to `artifacts/transgen/dist/public/`.

Preview the production bundle locally (same env vars required):

```powershell
$env:PORT = '4173'
$env:BASE_PATH = '/'
pnpm run serve
# → http://localhost:4173/
```

Or serve the static folder with any static server:

```powershell
npx --yes serve artifacts\transgen\dist\public -l 4173
```

---

## 5. Typecheck

```powershell
# from the repo root
pnpm run typecheck
```

---

## 6. Deploy

### Render (static site, free)

`render.yaml` at the repo root defines a static site:

1. Push to GitHub (repo root = this folder).
2. Render Dashboard → **New + → Blueprint** → pick the repo.
3. Render reads `render.yaml` and creates the `transgen` static site:
   - Build: `npm install -g pnpm@10.34.5 && pnpm install --frozen-lockfile && pnpm --filter @workspace/transgen run build`
   - Publish dir: `artifacts/transgen/dist/public`
   - Env: `PORT=10000`, `BASE_PATH=/`, `SKIP_INSTALL_DEPS=true`

### GitHub Pages

A Pages workflow lives in `.github/workflows/`. Pushing to `main` builds and publishes automatically.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `PORT environment variable is required` | Set `$env:PORT='5173'` (PowerShell) or `PORT=5173` (bash) before `pnpm run dev` |
| `BASE_PATH environment variable is required` | Set `$env:BASE_PATH='/'` (PowerShell) or `BASE_PATH=/` (bash) |
| Port already in use | Pick another port, e.g. `$env:PORT='8080'` |
| Stale page after pulling changes | Hard-reload (`Ctrl+Shift+R`); the dev server hot-reloads, but a full reload guarantees fresh code |
| `pnpm install` fails on version checks | Use the pinned manager: `npm install -g pnpm@10.34.5` |
| Live-reload logs filling the repo | `artifacts/transgen/dev.*.log` are git-ignored by design |
