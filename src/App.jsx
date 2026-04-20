import { useState } from "react";
import "./App.css";
import ImageConverter from "./ImageConverter";
import PdfEditor from "./components/PdfEditor";

function App() {
  const [activeModule, setActiveModule] = useState(null); // null = landing, "converter", "pdf"

  if (activeModule === "converter") {
    return <ImageConverter onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === "pdf") {
    return <PdfEditor onBack={() => setActiveModule(null)} />;
  }

  // ── Landing Screen ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 mb-2">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Media Studio
          </h1>
          <p className="text-slate-500 text-sm">
            Professional image conversion and PDF processing tools
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Image & GIF Converter Card */}
          <button
            onClick={() => setActiveModule("converter")}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-100">Image & GIF Converter</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Convert between PNG, JPG, and WEBP formats. Transform GIFs into animated WebP files. Single or batch processing.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">PNG</span>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">JPG</span>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">WEBP</span>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">GIF</span>
              </div>
              <div className="flex items-center text-xs text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">
                Open Converter
                <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </button>

          {/* PDF Editor Card */}
          <button
            onClick={() => setActiveModule("pdf")}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition-all duration-300 hover:border-rose-500/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-100">PDF Editor</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                View PDF documents, manage layers, navigate pages, and export individual pages as high-quality images.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">Layers</span>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">Pages</span>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-700">Export</span>
              </div>
              <div className="flex items-center text-xs text-rose-400 font-medium group-hover:text-rose-300 transition-colors">
                Open Editor
                <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600">
          Built with Tauri + React
        </p>
      </div>
    </div>
  );
}

export default App;
