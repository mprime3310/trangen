import { useState, useRef, useEffect } from "react";
import SingleBarcode from "./components/SingleBarcode";
import MultipleBarcodes from "./components/MultipleBarcodes";

interface Settings {
  showSimple: boolean;
  populateExample: boolean;
  populateDates: boolean;
  populateIdNum: boolean;
  generateMags: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  showSimple: true,
  populateExample: true,
  populateDates: false,
  populateIdNum: false,
  generateMags: true,
};

type Tab = "single" | "multiple";

export default function App() {
  const [tab, setTab] = useState<Tab>("single");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["Console output.."]);
  const [selectedState, setSelectedState] = useState("CA");
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("transgen:generate"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-200), msg]);
  };

  const toggleSetting = (key: keyof Settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    addLog(`[${new Date().toLocaleTimeString()}] Setting "${key}" toggled`);
  };

  const menuClick = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setOpenMenu(prev => (prev === name ? null : name));
  };

  const handleMenuAction = (action: string) => {
    setOpenMenu(null);
    if (action === "generate") {
      document.dispatchEvent(new CustomEvent("transgen:generate"));
    } else if (action === "exit") {
      addLog(`[${new Date().toLocaleTimeString()}] Exit requested (close this tab to exit).`);
    } else if (action === "docs") {
      window.open("https://github.com/Transgen/Transgen", "_blank");
    } else if (action === "github") {
      window.open("https://github.com/Transgen/Transgen", "_blank");
    }
  };

  const MenuButton = ({
    name, label, children,
  }: { name: string; label: string; children: React.ReactNode }) => (
    <div className="relative">
      <button
        className={`px-2 py-0.5 text-xs hover:bg-blue-200 ${openMenu === name ? "bg-blue-200" : ""}`}
        onClick={e => menuClick(e, name)}
      >
        {label}
      </button>
      {openMenu === name && (
        <div
          className="absolute left-0 top-full bg-card border border-border shadow-md z-50 min-w-[200px]"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );

  const MenuItem = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      className="w-full text-left px-3 py-1 text-xs hover:bg-accent"
      onClick={onClick}
    >
      {label}
    </button>
  );

  const CheckItem = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button
      className="w-full text-left px-3 py-1 text-xs hover:bg-accent flex items-center gap-2"
      onClick={onToggle}
    >
      <span className="w-3 text-center">{checked ? "✓" : ""}</span>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background select-none">
      <div className="flex items-center bg-secondary border-b border-border shrink-0 text-xs">
        <MenuButton name="file" label="File">
          <MenuItem label="Generate    Ctrl+S" onClick={() => handleMenuAction("generate")} />
          <div className="border-t border-border my-0.5" />
          <MenuItem label="Exit" onClick={() => handleMenuAction("exit")} />
        </MenuButton>
        <MenuButton name="settings" label="Settings">
          <CheckItem label="Show Simple Descriptions" checked={settings.showSimple} onToggle={() => toggleSetting("showSimple")} />
          <CheckItem label="Auto-populate Example Info" checked={settings.populateExample} onToggle={() => toggleSetting("populateExample")} />
          <CheckItem label="Auto-populate Dates" checked={settings.populateDates} onToggle={() => toggleSetting("populateDates")} />
          <CheckItem label="Auto-populate ID Numbers" checked={settings.populateIdNum} onToggle={() => toggleSetting("populateIdNum")} />
          <CheckItem label="Generate Mag Stripe Data" checked={settings.generateMags} onToggle={() => toggleSetting("generateMags")} />
        </MenuButton>
        <MenuButton name="help" label="Help">
          <MenuItem label="Documentation" onClick={() => handleMenuAction("docs")} />
          <MenuItem label="GitHub" onClick={() => handleMenuAction("github")} />
          <div className="border-t border-border my-0.5" />
          <div className="px-3 py-1 text-xs text-muted-foreground">Version: 2.0</div>
        </MenuButton>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden" style={{ height: "calc(100vh - 75px)" }}>
        <div className="flex flex-col overflow-hidden" style={{ flex: "0.72 1 0" }}>
          <div className="flex bg-secondary border-b border-border shrink-0">
            <button
              className={`px-4 py-1 text-xs border-r border-border ${tab === "single" ? "bg-card font-semibold border-b-2 border-b-primary" : "hover:bg-accent"}`}
              onClick={() => setTab("single")}
            >
              Single Barcode
            </button>
            <button
              className={`px-4 py-1 text-xs ${tab === "multiple" ? "bg-card font-semibold border-b-2 border-b-primary" : "hover:bg-accent"}`}
              onClick={() => setTab("multiple")}
            >
              Multiple Barcodes
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-card">
            {tab === "single" ? (
              <SingleBarcode
                settings={settings}
                onLog={addLog}
                selectedState={selectedState}
                onStateChange={setSelectedState}
              />
            ) : (
              <MultipleBarcodes
                settings={settings}
                onLog={addLog}
                selectedState={selectedState}
                onStateChange={setSelectedState}
              />
            )}
          </div>
        </div>

        <div
          className="shrink-0 border-t-2 border-border overflow-y-auto bg-black"
          style={{ flex: "0.28 1 0" }}
          ref={consoleRef}
        >
          <div className="console-text p-2 space-y-0.5">
            {logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
