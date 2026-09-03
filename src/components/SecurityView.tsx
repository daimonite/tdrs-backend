import React, { useState } from 'react';
import { INTEGRATION_GUIDES } from '../data/integrationData';
import { 
  ShieldCheck, 
  Cpu, 
  Copy, 
  Check, 
  CreditCard, 
  Smartphone, 
  Mail, 
  Activity, 
  Award, 
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCode2
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const [selectedGuideId, setSelectedGuideId] = useState<string>(INTEGRATION_GUIDES[0].id);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const currentGuide = INTEGRATION_GUIDES.find(g => g.id === selectedGuideId) || INTEGRATION_GUIDES[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Payments': return CreditCard;
      case 'SMS': return Smartphone;
      case 'Email': return Mail;
      case 'Fitness': return Activity;
      case 'Collectibles': return Award;
      default: return ShieldCheck;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Integration Connectors & Reliability Hardening</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Third-Party Integrations & Security Standards
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Hardened integration pipelines for PayMe Africa mobile money, Textify Africa SMS automation, Resend emails, Strava OAuth training sync, and digital collectible certificates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Integration Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">
            Integration Connectors ({INTEGRATION_GUIDES.length})
          </div>
          {INTEGRATION_GUIDES.map((guide) => {
            const isSelected = selectedGuideId === guide.id;
            const Icon = getCategoryIcon(guide.category);
            return (
              <button
                key={guide.id}
                onClick={() => setSelectedGuideId(guide.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">{guide.name}</div>
                    <div className="text-[11px] text-slate-500 font-normal">{guide.provider}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {guide.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Integration Guide Detail */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {currentGuide.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {currentGuide.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">{currentGuide.summary}</p>
              </div>

              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Auth: {currentGuide.authMethod}
              </span>
            </div>

            {/* Key Endpoints / Events */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Key Events & Methods:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentGuide.keyEndpointsOrEvents.map((evt, eIdx) => (
                  <div key={eIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span className="truncate">{evt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Implementation Sample */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-mono font-bold text-slate-800">{currentGuide.codeSample.filename}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(currentGuide.codeSample.code)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-[#0F172A] rounded-xl p-4 border border-slate-800 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                  <code>{currentGuide.codeSample.code}</code>
                </pre>
              </div>
            </div>

            {/* Best Practices & Failure Handling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Production Safeguards:</span>
                </div>
                <ul className="text-xs text-emerald-950 space-y-1 list-disc list-inside">
                  {currentGuide.bestPractices.map((bp, bpIdx) => (
                    <li key={bpIdx}>{bp}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Failure & Retry Strategy:</span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  {currentGuide.failureHandling}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
