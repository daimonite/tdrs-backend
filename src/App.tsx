/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TabType } from './types';
import { Header } from './components/Header';
import { ArchitectureView } from './components/ArchitectureView';
import { ApiReferenceView } from './components/ApiReferenceView';
import { SimulatorsView } from './components/SimulatorsView';
import { SecurityView } from './components/SecurityView';
import { SprintPlanView } from './components/SprintPlanView';
import { ExportView } from './components/ExportView';
import { ScheduleAView } from './components/ScheduleAView';
import { 
  Database, 
  Layers, 
  Code2, 
  Cpu, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule-a');

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col selection:bg-blue-500/20 selection:text-blue-700">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'schedule-a' && (
          <ScheduleAView />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}

        {activeTab === 'api-reference' && (
          <ApiReferenceView />
        )}

        {activeTab === 'simulators' && (
          <SimulatorsView />
        )}

        {activeTab === 'integrations' && (
          <SecurityView />
        )}

        {activeTab === 'sprint-plan' && (
          <SprintPlanView />
        )}

        {activeTab === 'export' && (
          <ExportView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 mt-12 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700">
              Tour de Rotary DSM 2026 • Backend Architecture & API Workbench (PostgreSQL 16 + Supabase + PayMe + Textify)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>Production Handoff: 15 Sept 2026</span>
            <span>•</span>
            <span>Event Day: 1 Nov 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
