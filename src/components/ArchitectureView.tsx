import React, { useState } from 'react';
import { SQL_TABLES, ARCHITECTURE_LAYERS } from '../data/architectureData';
import { 
  Database, 
  Layers, 
  Copy, 
  Check, 
  Table, 
  Key, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Sparkles,
  Calendar,
  Layers3
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>(SQL_TABLES[0].name);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'pipeline' | 'phases'>('tables');

  const currentTable = SQL_TABLES.find(t => t.name === selectedTable) || SQL_TABLES[0];

  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Executive Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Supabase PostgreSQL 16 Relational Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tour de Rotary DSM Database & Backend Pipeline
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Engineered as an annual reusable event platform. Supports mixed-cart ticketing and apparel checkout, 7-day inventory reservation locks with automatic release, PayMe Africa idempotent payments, and role-based access control for 5 stakeholder portals.
            </p>
          </div>

          {/* Sub-view switches */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'tables'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Schema & DDL Tables ({SQL_TABLES.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pipeline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers3 className="w-4 h-4" />
              <span>7-Layer Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('phases')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'phases'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Phase Engine Lifecycle</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABLES EXPLORER */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Table Selector Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              PostgreSQL Relational Tables
            </div>
            <div className="space-y-1.5">
              {SQL_TABLES.map((table) => {
                const isSelected = selectedTable === table.name;
                return (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table.name)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold truncate flex items-center gap-1.5">
                        <Table className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{table.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                        {table.category}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {table.columns.length} cols
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Detail & SQL Code Viewer */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {currentTable.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 font-mono">
                      {currentTable.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {currentTable.description}
                  </p>
                </div>

                <button
                  onClick={() => handleCopySql(currentTable.sqlCode)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedSql ? 'Copied SQL' : 'Copy DDL SQL'}</span>
                </button>
              </div>

              {/* Columns Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Attributes</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {currentTable.columns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1">
                          {col.isPrimary && <Key className="w-3 h-3 text-amber-500" title="Primary Key" />}
                          <span>{col.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-blue-700 font-semibold">{col.type}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-sans">
                          {col.isPrimary ? 'PK' : col.isForeign ? 'FK' : col.nullable ? 'NULL' : 'NOT NULL'}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-700">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RLS Policies if any */}
              {currentTable.rlsPolicies && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    <span>Row Level Security (RLS) Rules:</span>
                  </div>
                  <ul className="list-disc list-inside text-emerald-950 space-y-0.5">
                    {currentTable.rlsPolicies.map((pol, pIdx) => (
                      <li key={pIdx}>{pol}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SQL Code Block */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  PostgreSQL DDL Migration Snippet:
                </div>
                <div className="bg-[#0F172A] rounded-xl p-4 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                    <code>{currentTable.sqlCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 7-LAYER PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARCHITECTURE_LAYERS.map((layer) => (
              <div
                key={layer.layer}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      LAYER 0{layer.layer}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-500">
                      {layer.tech}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {layer.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {layer.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {layer.badges.map((b, bIdx) => (
                    <span key={bIdx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: PHASE ENGINE LIFECYCLE */}
      {activeTab === 'phases' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Annual Lifecycle & Automatic Phase Transition Engine
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              The backend automatically alters API responses and public behavior based on the configured edition phase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Phase 1 */}
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                  PHASE 1
                </span>
                <span className="text-xs font-mono font-bold text-blue-900">Pre-Event Mode</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Discovery, Registration & Merch Drops</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li>Accepts Cyclathon & Marathon ticket registrations</li>
                <li>Mixed cart checkout & promo codes enabled</li>
                <li>7-day merchandise stock reservation locking</li>
                <li>Day 4 & Day 6 SMS reminder worker active</li>
                <li>Strava training sync & badge leaderboards live</li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="border border-amber-300 bg-amber-50/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
                  PHASE 2
                </span>
                <span className="text-xs font-mono font-bold text-amber-950">Event-Day Mode</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">1 November 2026 Race Operations</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li>Automated 05:00 AM SMS morning briefing dispatched</li>
                <li>Volunteer gate QR ticket scanning active</li>
                <li>Live check-in and attendance timestamps logged</li>
                <li>Emergency broadcast SMS channel enabled</li>
                <li>Real-time incident hotline logging in HQ</li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                  PHASE 3
                </span>
                <span className="text-xs font-mono font-bold text-emerald-950">Post-Event M&E Mode</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Gratitude, Collectibles & Annual Reset</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li>Digital finisher certificates unlock with QR verify</li>
                <li>Post-event photos & impact stories activated</li>
                <li>Financial revenue & attendance reconciled</li>
                <li>Sponsor and M&E reports exported to PDF/Excel</li>
                <li>Annual reset clones configuration for 2027 edition</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
