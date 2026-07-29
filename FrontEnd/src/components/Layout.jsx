import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Layout({ children, currentView, onNavigate }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home', view: 'home' },
    { id: 'portal', icon: '💳', label: 'User Portal', view: 'user-select' },
    { id: 'admin', icon: '👮‍♂️', label: 'Admin Console', view: 'admin' },
    { id: 'explorer', icon: '🔎', label: 'Chain Explorer', view: 'explorer' },
    { id: 'suspicious', icon: '⚠️', label: 'Suspicious Txns', view: 'suspicious' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#ECEEEF] text-[#111827] transition-colors duration-200 font-sans selection:bg-[#00A865] selection:text-white">
      {/* Left Sidebar Navigation - PPT Deep Forest Theme */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-[#0B3820] text-white shadow-2xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full border-r border-[#072914]
      `}>
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-[#144A2C] flex justify-between items-center bg-[#072914]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md p-1 overflow-hidden border border-[#00A865]">
              <img src="/lloyds-horse.png" alt="Lloyds Horse" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight leading-none">FraudShield</h1>
              <p className="text-[9px] text-[#A3E3AB] font-mono uppercase tracking-widest font-black mt-1">
                LLOYDS TECH CENTRE
              </p>
            </div>
          </div>
          <button className="lg:hidden text-slate-300 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
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
                    ? 'bg-[#00A865] text-white shadow-lg border border-[#A3E3AB]/40'
                    : 'text-[#A3E3AB] hover:bg-[#072914] hover:text-white border border-transparent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#144A2C] bg-[#072914] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex-shrink-0 flex items-center justify-center border border-[#00A865]">
            <img src="/lloyds-horse.png" alt="Lloyds Horse" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#A3E3AB] font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00A865]" />
              <span>Team Stallion</span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono mt-0.5">LTC Hackathon 2026</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#ECEEEF]">
        {/* Top Navbar - PPT Slide Title Header Style */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-300/80 bg-white/90 backdrop-blur-md shadow-sm z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-700 hover:text-black focus:outline-none p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div>
              <span className="text-xs font-mono font-bold text-[#00A865] uppercase tracking-widest">
                LLOYDS TECHNOLOGY CENTRE HACKATHON 2026 — TEAM STALLION
              </span>
            </div>
          </div>

          {/* Top Right Horse Logo exactly as in PPT Slide */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-bold text-slate-600">FraudShield Active</span>
            <div className="w-10 h-10 bg-white rounded-lg p-1 border border-slate-200 shadow-sm flex items-center justify-center">
              <img src="/lloyds-horse.png" alt="Lloyds Rearing Horse" className="w-full h-full object-contain" />
            </div>
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
