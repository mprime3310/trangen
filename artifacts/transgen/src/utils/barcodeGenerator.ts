import bwipjs from "bwip-js";

export interface BarcodeOptions {
  width2D: number;
  height2D: number;
  width1D: number;
  height1D: number;
}

export function generatePDF417Canvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: BarcodeOptions
): void {
  // PDF417 does not take width/height options (those apply to linear barcodes
  // and would otherwise be interpreted as physical sizes, shrinking the code).
  // Size the matrix with `scale` instead so the module size stays readable.
  const scale = Math.max(2, Math.min(6, Math.round(options.width2D / 100)));
  bwipjs.toCanvas(canvas, {
    bcid: "pdf417",
    text: text,
    scale: scale,
    includetext: false,
    eclevel: 3,
  });
}

export function generateCode39Canvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: BarcodeOptions
): void {
  bwipjs.toCanvas(canvas, {
    bcid: "code39",
    text: text.replace(/[^A-Z0-9 \-$.\/+%]/gi, "").toUpperCase() || "0",
    scale: 2,
    height: Math.max(options.height1D / 10, 8),
    includetext: true,
    textxalign: "center",
  });
}

export function generateCode128Canvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: BarcodeOptions
): void {
  bwipjs.toCanvas(canvas, {
    bcid: "code128",
    text: text || "0",
    scale: 2,
    height: Math.max(options.height1D / 10, 8),
    includetext: true,
    textxalign: "center",
  });
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
