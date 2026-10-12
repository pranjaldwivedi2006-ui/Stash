import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Volume2 } from 'lucide-react';

interface AndroidPhoneFrameProps {
  children: React.ReactNode;
  isDeviceMode: boolean;
  onToggleMode: () => void;
}

export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({
  children,
  isDeviceMode,
  onToggleMode,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isDeviceMode) {
    return (
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col bg-slate-50 min-h-screen">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-slate-100">Stash Web Runtime</span>
            <span className="text-slate-400 hidden sm:inline">| Local Persistent SQLite/IndexedDB</span>
          </div>
          <button
            onClick={onToggleMode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Switch to Android Phone View</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6 select-none">
      {/* Top Bar Switcher */}
      <div className="w-full max-w-sm mb-3 flex items-center justify-between px-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">Pixel 8 Simulation</span>
        </div>
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Expand View</span>
        </button>
      </div>

      {/* Phone Shell */}
      <div className="relative w-full max-w-[410px] h-[840px] bg-slate-900 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-800/80 shadow-indigo-950/40 flex flex-col">
        {/* Outer Phone Border Highlight */}
        <div className="absolute inset-0 rounded-[44px] border-[3px] border-slate-700/60 pointer-events-none"></div>

        {/* Inner Screen */}
        <div className="relative w-full h-full bg-slate-50 rounded-[34px] overflow-hidden flex flex-col shadow-inner">
          {/* Android Status Bar */}
          <div className="h-9 bg-slate-900 text-slate-300 px-6 flex items-center justify-between text-xs select-none z-30 font-medium shrink-0">
            <span>{currentTime}</span>

            {/* Camera Punchhole */}
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950 ring-2 ring-slate-800"></div>

            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] font-bold tracking-tighter text-slate-300">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* Screen Body */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {children}
          </div>

          {/* Android Gesture Bar */}
          <div className="h-4 bg-slate-900 flex items-center justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
