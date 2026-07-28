import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun, Shield } from 'lucide-react';

export default function Layout({ children, currentView, onNavigate }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home', view: 'home' },
    { id: 'portal', icon: '💳', label: 'User Portal', view: 'user-select' },
    { id: 'admin', icon: '👮‍♂️', label: 'Admin Console', view: 'admin' },
    { id: 'explorer', icon: '🔎', label: 'Chain Explorer', view: 'explorer' },
    { id: 'suspicious', icon: '⚠️', label: 'Suspicious Txns', view: 'suspicious' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#00140D] text-slate-100 transition-colors duration-200 font-sans selection:bg-[#00BA63] selection:text-white">
      {/* Left Sidebar Navigation */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-[#001F15]/95 backdrop-blur-2xl border-r border-emerald-900/60 shadow-2xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full
      `}>
        {/* Lloyds Technology Centre Brand Header */}
        <div className="p-5 border-b border-emerald-900/60 flex justify-between items-center bg-[#00170F]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006A3B] via-[#00BA63] to-teal-400 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-emerald-900/50 border border-emerald-400/40">
              🐎
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-white tracking-tight">FraudShield</h1>
                <span className="w-2 h-2 rounded-full bg-[#00BA63] animate-pulse" />
              </div>
              <p className="text-[9px] text-[#00BA63] font-mono uppercase tracking-widest font-black mt-0.5">
                LLOYDS TECH CENTRE
              </p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={22} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.view);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold transition-all text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-[#006A3B]/60 via-[#00BA63]/20 to-transparent text-[#00BA63] border border-[#00BA63]/50 shadow-[0_0_20px_rgba(0,186,99,0.2)]'
                    : 'text-slate-300 hover:bg-emerald-950/60 hover:text-white border border-transparent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-emerald-900/60 bg-[#00170F]/80">
          <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00BA63]" />
            <span>Team Stallion · LTC Hackathon</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Isolation Forest ML & Canton Ledger</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-emerald-900/60 bg-[#001A10]/90 backdrop-blur-xl shadow-md z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-300 hover:text-white focus:outline-none p-1.5 rounded-lg hover:bg-emerald-900/40 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/30 text-xs font-mono font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-[#00BA63] animate-ping" />
              <span>LLOYDS TECHNOLOGY CENTRE HACKATHON 2026 — TEAM STALLION</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-900/50 border border-emerald-800/60 transition-all flex items-center gap-2 text-xs font-mono font-bold"
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-emerald-400" />}
              <span className="hidden md:inline">{isDarkMode ? 'Lloyds Emerald' : 'Light Mode'}</span>
            </button>
          </div>
        </header>

        <main className={`flex-1 flex flex-col ${currentView === 'user-portal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`flex-1 flex flex-col min-h-0 ${currentView === 'user-portal' ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#00100A]/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
