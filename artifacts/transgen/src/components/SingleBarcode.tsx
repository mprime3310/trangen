import { useEffect, useRef, useState } from "react";
import {
  DLFields,
  US_STATES,
  EYE_COLORS,
  HAIR_COLORS,
  SEX_OPTIONS,
  LICENSE_CLASSES,
  buildAamvaPdf417,
  buildMagStripe,
  generateExampleFields,
  generateIcn,
  generateIdNumber,
  CSV_EXAMPLE,
} from "../utils/aamva";
import {
  generatePDF417Canvas,
  generateCode128Canvas,
  downloadCanvas,
  BarcodeOptions,
} from "../utils/barcodeGenerator";

interface Props {
  settings: {
    showSimple: boolean;
    populateExample: boolean;
    populateDates: boolean;
    populateIdNum: boolean;
    generateMags: boolean;
  };
  onLog: (msg: string) => void;
  selectedState: string;
  onStateChange: (s: string) => void;
}

const FIELD_LABELS: Record<keyof DLFields, { simple: string; full: string }> = {
  lastName: { simple: "Last Name", full: "DCS – Customer Family Name" },
  firstName: { simple: "First Name", full: "DAC – Customer First Name" },
  middleName: { simple: "Middle Name", full: "DAD – Customer Middle Name" },
  address1: { simple: "Address Line 1", full: "DAG – Mailing Street Address 1" },
  address2: { simple: "Address Line 2", full: "DAH – Mailing Street Address 2" },
  city: { simple: "City", full: "DAI – Mailing City" },
  state: { simple: "State", full: "DAJ – Mailing Jurisdiction Code" },
  zip: { simple: "Zip Code", full: "DAK – Mailing Postal Code" },
  country: { simple: "Country", full: "DCG – Country Identification" },
  dob: { simple: "Date of Birth", full: "DBB – Date of Birth" },
  sex: { simple: "Sex", full: "DBC – Physical Description – Sex" },
  eyeColor: { simple: "Eye Color", full: "DAY – Physical Description – Eye Color" },
  hairColor: { simple: "Hair Color", full: "DAZ – Physical Description – Hair Color" },
  height: { simple: "Height", full: "DAU – Physical Description – Height" },
  weight: { simple: "Weight (lbs)", full: "DAW – Physical Description – Weight (lbs)" },
  idNumber: { simple: "ID / License Number", full: "DAQ – Customer ID Number" },
  icn: { simple: "ICN (Inventory Control No.)", full: "DCK – Inventory Control Number" },
  licenseClass: { simple: "License Class", full: "DCA – Jurisdiction-specific vehicle class" },
  expDate: { simple: "Expiration Date", full: "DBA – Document Expiration Date" },
  issueDate: { simple: "Issue Date", full: "DBD – Document Issue Date" },
  documentDiscriminator: { simple: "Document Discriminator", full: "DCF – Document Discriminator" },
  restrictions: { simple: "Restrictions", full: "DCB – Jurisdiction-specific restriction codes" },
  endorsements: { simple: "Endorsements", full: "DCD – Jurisdiction-specific endorsement codes" },
  vehicleClass: { simple: "Vehicle Class", full: "DCA – Jurisdiction-specific vehicle class" },
  revisionDate: { simple: "Revision Date", full: "DBF – Revision Date" },
  complianceType: { simple: "Compliance Type", full: "DDA – Compliance Type (F/N/M)" },
};

const emptyFields = (): DLFields => ({
  lastName: "", firstName: "", middleName: "",
  address1: "", address2: "", city: "", state: "", zip: "",
  country: "USA", dob: "", sex: "1", eyeColor: "BRO",
  hairColor: "BRO", height: "", weight: "", idNumber: "", icn: "",
  licenseClass: "C", expDate: "", issueDate: "",
  documentDiscriminator: "", restrictions: "NONE",
  endorsements: "NONE", vehicleClass: "C",
  revisionDate: "", complianceType: "F",
});

export default function SingleBarcode({ settings, onLog, selectedState, onStateChange }: Props) {
  const [fields, setFields] = useState<DLFields>(() => {
    if (settings.populateExample) return generateExampleFields(selectedState || "CA");
    return emptyFields();
  });
  const [barOptions, setBarOptions] = useState<BarcodeOptions>({
    width2D: 300, height2D: 120, width1D: 300, height1D: 80,
  });
  const [generated, setGenerated] = useState(false);
  const [magStripe, setMagStripe] = useState<{ track1: string; track2: string; track3: string } | null>(null);

  const canvas2D = useRef<HTMLCanvasElement>(null);
  const canvas1D = useRef<HTMLCanvasElement>(null);
  // Tracks whether the user pinned a custom ICN. When false, the ICN is
  // regenerated dynamically on every generate.
  const icnLocked = useRef(false);

  useEffect(() => {
    if (settings.populateExample) {
      const example = generateExampleFields(selectedState || "CA");
      icnLocked.current = false;
      setFields(example);
    }
  }, [settings.populateExample, selectedState]);

  useEffect(() => {
    const handler = () => generate();
    document.addEventListener("transgen:generate", handler);
    return () => document.removeEventListener("transgen:generate", handler);
  });

  const handleField = (key: keyof DLFields, value: string) => {
    // A non-empty, manually-entered ICN pins the value; clearing it re-enables
    // dynamic generation.
    if (key === "icn") icnLocked.current = value.trim() !== "";
    setFields(prev => ({ ...prev, [key]: value }));
    setGenerated(false);
  };

  const handleStateChange = (state: string) => {
    onStateChange(state);
    setFields(prev => ({ ...prev, state }));
    setGenerated(false);
  };

  const generate = () => {
    try {
      // Resolve the fields for this run. The ICN (and, when enabled, the ID
      // number) is generated dynamically rather than being a fixed value.
      const next: DLFields = { ...fields };
      if (settings.populateIdNum) {
        next.idNumber = generateIdNumber(next.state);
        next.icn = generateIcn();
      } else if (!icnLocked.current) {
        // The ICN is dynamic: a fresh value is generated on every run unless the
        // user has typed a custom (non-empty) ICN.
        next.icn = generateIcn();
      }
      setFields(next);
      setGenerated(false);

      const data = buildAamvaPdf417(next);
      if (canvas2D.current) {
        generatePDF417Canvas(canvas2D.current, data, barOptions);
        onLog(`[${new Date().toLocaleTimeString()}] PDF417 2D barcode generated for ${next.firstName} ${next.lastName}`);
      }
      if (canvas1D.current) {
        const icnText = (next.icn || next.idNumber || "0").replace(/[^ -~]/g, "").trim() || "0";
        generateCode128Canvas(canvas1D.current, icnText, barOptions);
        onLog(`[${new Date().toLocaleTimeString()}] Code 128 1D barcode generated (ICN: ${icnText})`);
      }
      if (settings.generateMags) {
        const mags = buildMagStripe(next);
        setMagStripe(mags);
        onLog(`[${new Date().toLocaleTimeString()}] Magnetic stripe data generated`);
      }
      setGenerated(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onLog(`[ERROR] ${msg}`);
    }
  };

  const download2D = () => {
    if (canvas2D.current) downloadCanvas(canvas2D.current, `${fields.idNumber || "barcode"}_2d.png`);
  };
  const download1D = () => {
    if (canvas1D.current) downloadCanvas(canvas1D.current, `${fields.idNumber || "barcode"}_1d.png`);
  };

  const label = (key: keyof DLFields) =>
    settings.showSimple ? FIELD_LABELS[key].simple : FIELD_LABELS[key].full;

  const renderField = (key: keyof DLFields) => {
    const val = fields[key];

    if (key === "state") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      );
    }
    if (key === "sex") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            {SEX_OPTIONS.map(s => <option key={s} value={s.charAt(0)}>{s}</option>)}
          </select>
        </div>
      );
    }
    if (key === "eyeColor") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            {EYE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      );
    }
    if (key === "hairColor") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            {HAIR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      );
    }
    if (key === "licenseClass" || key === "vehicleClass") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            {LICENSE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      );
    }
    if (key === "complianceType") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <select
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
          >
            <option value="F">F – Full Compliance</option>
            <option value="N">N – Non-AAMVA</option>
            <option value="M">M – Magnetic stripe only</option>
          </select>
        </div>
      );
    }
    if (key === "dob" || key === "expDate" || key === "issueDate") {
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
          <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
          <input
            type="date"
            className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
            value={val}
            onChange={e => handleField(key, e.target.value)}
            disabled={key !== "dob" && settings.populateDates}
          />
        </div>
      );
    }
    if (key === "revisionDate") return null;

    return (
      <div key={key} className="flex items-center gap-2 py-1 border-b border-border">
        <label className="w-56 text-xs text-muted-foreground shrink-0">{label(key)}</label>
        <input
          type="text"
          className="flex-1 border border-border rounded px-1 py-0.5 bg-card text-xs"
          value={val}
          onChange={e => handleField(key, e.target.value)}
          placeholder={FIELD_LABELS[key].simple}
          readOnly={(key === "idNumber" || key === "icn") && settings.populateIdNum}
        />
      </div>
    );
  };

  const fieldOrder: (keyof DLFields)[] = [
    "lastName", "firstName", "middleName",
    "address1", "address2", "city", "state", "zip", "country",
    "dob", "sex", "eyeColor", "hairColor", "height", "weight",
    "idNumber", "icn", "licenseClass", "vehicleClass",
    "expDate", "issueDate",
    "documentDiscriminator", "restrictions", "endorsements",
    "complianceType",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 bg-secondary border-b border-border px-2 py-1 shrink-0">
        <select
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-16"
          value={selectedState}
          onChange={e => handleStateChange(e.target.value)}
        >
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="number"
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-20"
          placeholder="2D Width"
          value={barOptions.width2D}
          onChange={e => setBarOptions(p => ({ ...p, width2D: +e.target.value }))}
        />
        <input
          type="number"
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-20"
          placeholder="2D Height"
          value={barOptions.height2D}
          onChange={e => setBarOptions(p => ({ ...p, height2D: +e.target.value }))}
        />
        <input
          type="number"
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-20"
          placeholder="1D Width"
          value={barOptions.width1D}
          onChange={e => setBarOptions(p => ({ ...p, width1D: +e.target.value }))}
        />
        <input
          type="number"
          className="border border-border rounded px-1 py-0.5 bg-card text-xs w-20"
          placeholder="1D Height"
          value={barOptions.height1D}
          onChange={e => setBarOptions(p => ({ ...p, height1D: +e.target.value }))}
        />
        <button
          onClick={generate}
          className="ml-auto border border-border bg-primary text-primary-foreground hover:opacity-90 text-xs px-4 py-0.5 rounded font-semibold"
        >
          Generate (Ctrl+S)
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto border-r border-border px-2 pt-1">
          {fieldOrder.map(k => renderField(k))}
          <div className="py-2" />
        </div>

        <div className="w-1/2 flex flex-col overflow-y-auto px-3 pt-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">PDF417 2D Barcode</div>
            <div className="bg-white border border-border rounded p-2 min-h-[80px] flex items-center justify-center">
              <canvas ref={canvas2D} />
            </div>
            {generated && (
              <button onClick={download2D} className="mt-1 text-xs text-primary underline">
                Download 2D PNG
              </button>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Code 128 1D Barcode (ICN)</div>
            <div className="bg-white border border-border rounded p-2 min-h-[60px] flex items-center justify-center overflow-x-auto">
              <canvas ref={canvas1D} />
            </div>
            {generated && (
              <button onClick={download1D} className="mt-1 text-xs text-primary underline">
                Download 1D PNG
              </button>
            )}
          </div>

          {generated && settings.generateMags && magStripe && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Magnetic Stripe Data</div>
              <div className="bg-black rounded p-2 font-mono text-xs text-green-400 space-y-1">
                <div><span className="text-yellow-400">Track 1:</span> {magStripe.track1}</div>
                <div><span className="text-yellow-400">Track 2:</span> {magStripe.track2}</div>
                <div><span className="text-yellow-400">Track 3:</span> {magStripe.track3}</div>
              </div>
            </div>
          )}

          {generated && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Raw AAMVA Data</div>
              <textarea
                readOnly
                className="w-full h-28 text-xs font-mono border border-border rounded p-1 bg-card resize-none"
                value={buildAamvaPdf417(fields)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
