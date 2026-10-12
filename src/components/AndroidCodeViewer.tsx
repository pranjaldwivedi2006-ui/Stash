import React, { useState } from 'react';
import { ANDROID_PROJECT_FILES, AndroidFile } from '../android-code/files';
import { downloadAndroidProjectZip } from '../utils/zipExporter';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Folder,
  Layers,
  BookOpen,
  Terminal,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

export const AndroidCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(
    ANDROID_PROJECT_FILES.find((f) => f.path.endsWith('StashItem.kt')) || ANDROID_PROJECT_FILES[0]
  );
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'guide'>('files');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadAndroidProjectZip();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner explaining the architecture */}
      <div className="bg-slate-800/80 border-b border-slate-700/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Android Studio Kotlin Project</span>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                Room + Jetpack Compose
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete, runnable project tree with SQLite Room database, ViewModel & Material 3.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-700 text-xs font-medium">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Source Explorer
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'guide' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Beginner's Guide
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition cursor-pointer disabled:opacity-50"
            title="Download full project as a zip file to open in Android Studio"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Zipping...' : 'Download Project .ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Main View */}
      {activeTab === 'files' ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto max-h-48 md:max-h-full">
            <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Project Structure</span>
              <span className="text-[10px] text-slate-500">{ANDROID_PROJECT_FILES.length} files</span>
            </div>
            <div className="p-2 space-y-0.5">
              {ANDROID_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{file.path}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* File info header */}
            <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono text-indigo-400 font-semibold">
                  {selectedFile.path}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedFile.description}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200 select-text bg-slate-950/60">
              <pre className="whitespace-pre">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Beginner's Architecture Guide Tab */
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 text-slate-200 text-sm">
          <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Beginner's Guide: How Stash Works in Android</span>
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Stash follows modern Android Clean Architecture recommended by Google: Room SQLite Database → Data Access Object (DAO) → Repository → ViewModel (StateFlow) → Jetpack Compose UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs">1</span>
                <span>Room Database & SQLite Entity</span>
              </div>
              <p className="text-xs text-slate-300">
                <code className="text-indigo-300">StashItem.kt</code> is marked with <code className="text-indigo-300">@Entity(tableName = "stash_items")</code>. Room automatically generates an SQLite database file (<code className="text-slate-400">stash_database.db</code>) on disk. Data is never lost when closing the app.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs">2</span>
                <span>Reactive Flow in DAO</span>
              </div>
              <p className="text-xs text-slate-300">
                In <code className="text-indigo-300">StashDao.kt</code>, query functions return <code className="text-indigo-300">Flow&lt;List&lt;StashItem&gt;&gt;</code>. Whenever an item is saved, edited, or deleted, Room notifies all active Flows and the Compose screen re-renders automatically without manual re-fetching!
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs">3</span>
                <span>ViewModel & Coroutines</span>
              </div>
              <p className="text-xs text-slate-300">
                <code className="text-indigo-300">StashViewModel.kt</code> uses <code className="text-indigo-300">viewModelScope.launch</code> for asynchronous background operations (insert, delete, archive), preventing any UI stutter or frame drops.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs">4</span>
                <span>Jetpack Compose UI (Material 3)</span>
              </div>
              <p className="text-xs text-slate-300">
                Declarative UI using Material 3 components: <code className="text-indigo-300">LazyColumn</code>, <code className="text-indigo-300">FilterChip</code>, <code className="text-indigo-300">FloatingActionButton</code>, and <code className="text-indigo-300">TopAppBar</code>.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>How to Run in Android Studio (Step-by-Step)</span>
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
              <li>Click the green <strong>"Download Project .ZIP"</strong> button above to download the full source code.</li>
              <li>Extract the ZIP to a directory like <code className="text-emerald-300">~/AndroidStudioProjects/Stash</code>.</li>
              <li>Launch <strong>Android Studio</strong> (Koala, Hedgehog, or newer).</li>
              <li>Select <strong>File → Open...</strong> and choose the extracted folder.</li>
              <li>Wait 30-60 seconds for Gradle sync to complete and download libraries.</li>
              <li>Click the green <strong>Run (▶)</strong> button in the top toolbar to start the app in your Android Virtual Device (AVD emulator) or plugged-in physical phone!</li>
              <li>To inspect the SQLite database, open <strong>View → Tool Windows → App Inspection</strong> and select <strong>Database Inspector</strong>.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
