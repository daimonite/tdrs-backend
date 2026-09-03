import React from 'react';
import { TabType } from '../types';
import { 
  Database, 
  Layers, 
  PlayCircle, 
  Cpu, 
  Code2, 
  Calendar,
  Sparkles,
  ShieldCheck,
  FolderDown,
  Download,
  FileCheck2
} from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab
}) => {
  const navTabs = [
    { id: 'schedule-a' as TabType, label: 'Schedule A Scope', icon: FileCheck2, badge: 'A1 - A11 Verified' },
    { id: 'architecture' as TabType, label: 'PostgreSQL Schema & Pipeline', icon: Database, badge: '9 Core Tables' },
    { id: 'api-reference' as TabType, label: '5 Portals REST API', icon: Code2, badge: 'Role-Based Endpoints' },
    { id: 'simulators' as TabType, label: 'Interactive Backend Simulators', icon: PlayCircle, badge: '4 Engines' },
    { id: 'integrations' as TabType, label: 'Integrations & Hardening', icon: Cpu, badge: 'PayMe • Textify • Strava' },
    { id: 'sprint-plan' as TabType, label: 'Sprint Plan & Gates (2026)', icon: Calendar, badge: '15 Sept Handoff' },
    { id: 'export' as TabType, label: 'Export for smart01-bot', icon: FolderDown, badge: 'ZIP & .env' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0F172A] text-slate-100 sticky top-0 z-50 shadow-md">
      {/* Top Banner with System Telemetry */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0 text-white font-black text-lg">
            T
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-tight">
                TOUR DE ROTARY <span className="text-blue-400 font-extrabold">DSM</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Backend Architecture Platform
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                2026 Annual Edition
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                Backend Services: Online
              </span>
              <span>•</span>
              <span className="text-slate-300 font-mono text-[11px]">Supabase PostgreSQL 16 + PayMe Africa + Textify Africa SMS + Resend</span>
            </div>
          </div>
        </div>

        {/* Milestone Badge, Event Date & Download Action */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          <div className="hidden sm:flex bg-slate-900/90 px-3.5 py-1.5 rounded-lg border border-slate-800 items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Production Handoff Gate</div>
              <div className="text-xs font-bold text-blue-400 font-mono">15 September 2026</div>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Event Day</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">1 November 2026</div>
            </div>
          </div>

          <a
            href="/tourderotary-dsm-backend.zip"
            download="tourderotary-dsm-backend.zip"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 border-t border-slate-800 pt-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-blue-400 text-blue-400 bg-slate-800/60 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                  isActive 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
