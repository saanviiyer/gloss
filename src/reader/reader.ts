// Bundled PDF.js reader. Chrome's native PDF viewer does not expose text
// selections to extensions, so this extension page renders PDFs itself with a
// selectable text layer and runs the same highlight -> Explain flow.

import * as pdfjsLib from "pdfjs-dist";
import { installGloss } from "../shared/gloss-ui.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdfjs/pdf.worker.min.mjs");

const SCALE = 1.4;

const pagesEl = document.getElementById("pages") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const fileInput = document.getElementById("file") as HTMLInputElement;
const urlInput = document.getElementById("url") as HTMLInputElement;
const openUrlBtn = document.getElementById("open-url") as HTMLButtonElement;

// The shared gloss UI works on the reader document exactly as on a web page.
installGloss();

function setStatus(msg: string, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

async function renderPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
): Promise<void> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: SCALE });

  const wrapper = document.createElement("div");
  wrapper.className = "page";
  wrapper.style.width = `${viewport.width}px`;
  wrapper.style.height = `${viewport.height}px`;
  // Required by the PDF.js text layer for correct span positioning.
  wrapper.style.setProperty("--scale-factor", String(SCALE));

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const canvasCtx = canvas.getContext("2d");
  wrapper.appendChild(canvas);

  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "textLayer";
  wrapper.appendChild(textLayerDiv);

  pagesEl.appendChild(wrapper);

  if (canvasCtx) {
    await page.render({ canvasContext: canvasCtx, viewport }).promise;
  }

  const textContent = await page.getTextContent();
  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport,
  });
  await textLayer.render();
}

async function renderDocument(src: { url: string } | { data: ArrayBuffer }): Promise<void> {
  pagesEl.innerHTML = "";
  setStatus("Loading PDF…");
  try {
    const loadingTask = pdfjsLib.getDocument(
      "url" in src ? { url: src.url } : { data: new Uint8Array(src.data) },
    );
    const pdf = await loadingTask.promise;
    setStatus(`Rendering ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}…`);
    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(pdf, i);
    }
    setStatus(`${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}. Highlight text, then click Explain.`);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to load PDF.", true);
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (reader.result instanceof ArrayBuffer) {
      void renderDocument({ data: reader.result });
    }
  };
  reader.readAsArrayBuffer(file);
});

openUrlBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (url) void renderDocument({ url });
});

// Accept a ?file=<url> query param to open a PDF directly.
const paramUrl = new URLSearchParams(location.search).get("file");
if (paramUrl) {
  urlInput.value = paramUrl;
  void renderDocument({ url: paramUrl });
} else {
  setStatus("Open a local PDF or paste a URL to begin.");
}
