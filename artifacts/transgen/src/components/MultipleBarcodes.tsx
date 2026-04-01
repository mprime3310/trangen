import { useRef, useState } from "react";
import Papa from "papaparse";
import bwipjs from "bwip-js";
import {
  US_STATES,
  CSV_EXAMPLE,
  parseCSVFields,
  buildAamvaPdf417,
  buildMagStripe,
  DLFields,
} from "../utils/aamva";
import { BarcodeOptions } from "../utils/barcodeGenerator";

interface Props {
  settings: {
    showSimple: boolean;
    generateMags: boolean;
  };
  onLog: (msg: string) => void;
  selectedState: string;
  onStateChange: (s: string) => void;
}

interface GeneratedEntry {
  id: number;
  fields: DLFields;
  pdf417Url: string;
  code39Url: string;
  magStripe?: { track1: string; track2: string; track3: string };
}

function generateBarcodeDataUrl(
  bcid: string,
  text: string,
  opts: Partial<bwipjs.RenderOptions>
): string {
  const canvas = document.createElement("canvas");
  bwipjs.toCanvas(canvas, { bcid, text, scale: 2, ...opts } as bwipjs.RenderOptions);
  return canvas.toDataURL("image/png");
}

export default function MultipleBarcodes({ settings, onLog, selectedState, onStateChange }: Props) {
  const [csvFilename, setCsvFilename] = useState("");
  const [entries, setEntries] = useState<GeneratedEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [barOptions] = useState<BarcodeOptions>({
    width2D: 300, height2D: 120, width1D: 300, height1D: 80,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const selectCSV = () => fileRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    onLog(`[${new Date().toLocaleTimeString()}] Loaded CSV: ${file.name}`);
  };

  const generate = async () => {
    if (!fileRef.current?.files?.[0] && csvFilename === "") {
      onLog("[ERROR] No CSV file selected.");
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (!file) {
      onLog("[ERROR] No file loaded.");
      return;
    }

    setGenerating(true);
    onLog(`[${new Date().toLocaleTimeString()}] Starting batch generation from ${file.name}...`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const generated: GeneratedEntry[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const fields = parseCSVFields(row);
            if (fields.state === "" || !fields.state) {
              fields.state = selectedState;
            }
            const data = buildAamvaPdf417(fields);
            const pdf417Url = generateBarcodeDataUrl("pdf417", data, {
              height: Math.max(barOptions.height2D / 10, 5),
              eclevel: 3,
              includetext: false,
            } as unknown as bwipjs.RenderOptions);

            const code39Text = (fields.idNumber || "ID").toUpperCase().replace(/[^A-Z0-9\-\.\s$\/+%]/g, "") || "0";
            const code39Url = generateBarcodeDataUrl("code39", code39Text, {
              height: Math.max(barOptions.height1D / 10, 8),
              includetext: true,
              textxalign: "center",
            } as unknown as bwipjs.RenderOptions);

            const magStripe = settings.generateMags ? buildMagStripe(fields) : undefined;

            generated.push({ id: i + 1, fields, pdf417Url, code39Url, magStripe });
            onLog(`[${new Date().toLocaleTimeString()}] Generated barcode for ${fields.firstName} ${fields.lastName} (row ${i + 1})`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            onLog(`[ERROR] Row ${i + 1}: ${msg}`);
          }
        }

        setEntries(generated);
        setGenerating(false);
        onLog(`[${new Date().toLocaleTimeString()}] Batch complete. ${generated.length} barcode(s) generated.`);
      },
      error: (err) => {
        onLog(`[ERROR] CSV parse error: ${err.message}`);
        setGenerating(false);
      },
    });
  };

  const downloadAll = () => {
    entries.forEach((entry) => {
      const a1 = document.createElement("a");
      a1.download = `${entry.fields.idNumber || `row_${entry.id}`}_2d.png`;
      a1.href = entry.pdf417Url;
      a1.click();
      setTimeout(() => {
        const a2 = document.createElement("a");
        a2.download = `${entry.fields.idNumber || `row_${entry.id}`}_1d.png`;
        a2.href = entry.code39Url;
        a2.click();
      }, 100 * entry.id);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 bg-secondary border-b border-border px-2 py-1 shrink-0">
        <select
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-16"
          value={selectedState}
          onChange={e => onStateChange(e.target.value)}
        >
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={selectCSV}
          className="border border-border bg-card hover:bg-accent text-xs px-2 py-0.5 rounded"
        >
          Select CSV...
        </button>
        <input
          type="text"
          readOnly
          className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
          value={csvFilename}
          placeholder="No CSV selected"
        />
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-border overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">CSV Format Example</div>
            <textarea
              readOnly
              className="w-full h-full text-xs font-mono border border-border rounded p-1 bg-card resize-none"
              style={{ minHeight: "300px" }}
              value={CSV_EXAMPLE}
            />
          </div>
        </div>

        <div className="w-1/2 overflow-y-auto p-2">
          <div className="flex gap-2 mb-2">
            <button
              onClick={generate}
              disabled={generating || !csvFilename}
              className="border border-border bg-primary text-primary-foreground hover:opacity-90 text-xs px-3 py-1 rounded disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Barcodes"}
            </button>
            {entries.length > 0 && (
              <button
                onClick={downloadAll}
                className="border border-border bg-card hover:bg-accent text-xs px-3 py-1 rounded"
              >
                Download All ({entries.length})
              </button>
            )}
          </div>

          {entries.length === 0 && !generating && (
            <div className="text-xs text-muted-foreground mt-4 text-center">
              Select a CSV file and click Generate Barcodes
            </div>
          )}

          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="border border-border rounded bg-card p-2">
                <div className="text-xs font-semibold mb-1">
                  #{entry.id} — {entry.fields.firstName} {entry.fields.lastName} ({entry.fields.idNumber})
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">PDF417</div>
                    <img src={entry.pdf417Url} alt="PDF417" className="border border-border bg-white" style={{ maxWidth: 200 }} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Code39</div>
                    <img src={entry.code39Url} alt="Code39" className="border border-border bg-white" style={{ maxWidth: 200 }} />
                  </div>
                </div>
                {entry.magStripe && (
                  <div className="mt-1 bg-black rounded p-1 font-mono text-xs text-green-400 space-y-0.5">
                    <div><span className="text-yellow-400">T1:</span> {entry.magStripe.track1}</div>
                    <div><span className="text-yellow-400">T2:</span> {entry.magStripe.track2}</div>
                    <div><span className="text-yellow-400">T3:</span> {entry.magStripe.track3}</div>
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <a href={entry.pdf417Url} download={`${entry.fields.idNumber}_2d.png`} className="text-xs text-primary underline">DL 2D</a>
                  <a href={entry.code39Url} download={`${entry.fields.idNumber}_1d.png`} className="text-xs text-primary underline">ID 1D</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
