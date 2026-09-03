import React, { useState } from 'react';
import { SPRINT_PHASES } from '../data/sprintPlanData';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Flag, 
  Award, 
  DollarSign, 
  Layers, 
  Check, 
  Sparkles,
  ShieldCheck,
  Building2,
  FileCheck
} from 'lucide-react';

export const SprintPlanView: React.FC = () => {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(SPRINT_PHASES[1].id); // Sprint 2 currently
  const [completedDeliverables, setCompletedDeliverables] = useState<Record<string, boolean>>({
    'PostgreSQL Relational DDL & Migrations': true,
    '5-Role RBAC & Row Level Security (RLS)': true,
    'Environment & Secrets Configuration': true,
    'Public Activities & Routes API (/api/v1/activities)': true,
    'Mixed Cart Checkout & Pricing Engine': true,
    '7-Day Merchandise Reservation State Machine': true,
  });

  const toggleDeliverable = (title: string) => {
    setCompletedDeliverables(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const currentPhase = SPRINT_PHASES.find(p => p.id === selectedPhaseId) || SPRINT_PHASES[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Executive Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Accelerated Delivery Schedule: 19 Aug - 15 Sept 2026</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tour de Rotary DSM 2026 Backend Sprint Roadmap
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Structured delivery gates leading up to the <strong>15 September 2026 Production Handoff</strong>, followed by live pre-event operations, <strong>1 November 2026 Event Day</strong>, and November M&E closeout.
          </p>
        </div>
      </div>

      {/* Architecture & Delivery Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Core Database Tables</div>
          <div className="text-xl font-bold text-slate-900 font-mono">10 Relational Entities</div>
          <div className="text-[11px] text-slate-500">PostgreSQL 16 with RLS & FK constraints</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">External Services</div>
          <div className="text-xl font-bold text-blue-600 font-mono">4 Gateways Ready</div>
          <div className="text-[11px] text-slate-500">PayMe Africa, Textify SMS, Resend & Strava</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Role-Based Access</div>
          <div className="text-xl font-bold text-emerald-600 font-mono">5 Dedicated Portals</div>
          <div className="text-[11px] text-slate-500">Participant, Volunteer, Sponsor, Partner & Admin</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Production Target</div>
          <div className="text-xl font-bold text-purple-700 font-mono">15 Sept 2026</div>
          <div className="text-[11px] text-slate-500">Complete API & Database Handoff</div>
        </div>
      </div>

      {/* Sprint Timeline Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">
            Sprint Timeline & Lifecycle ({SPRINT_PHASES.length} Stages)
          </div>
          {SPRINT_PHASES.map((phase) => {
            const isSelected = selectedPhaseId === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhaseId(phase.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-blue-700">{phase.dates}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    phase.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    phase.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {phase.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 truncate">{phase.title}</div>
                <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">{phase.focus}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Sprint Detail */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {currentPhase.dates}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{currentPhase.title}</h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">{currentPhase.focus}</p>
            </div>

            {/* Deliverables Checklist */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Key Deliverables ({currentPhase.deliverables.length}):
              </div>
              <div className="space-y-2.5">
                {currentPhase.deliverables.map((item, idx) => {
                  const isDone = completedDeliverables[item.title] ?? item.done;
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleDeliverable(item.title)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border ${
                        isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                      }`}>
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isDone ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border">
                            {item.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{item.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quality Checklist & Gate Criteria */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Phase Verification & Acceptance Criteria:</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {currentPhase.keyChecklist.map((chk, cIdx) => (
                  <li key={cIdx}>{chk}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
