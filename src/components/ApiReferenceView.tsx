import React, { useState } from 'react';
import { API_ENDPOINTS } from '../data/apiEndpointsData';
import { PortalRole } from '../types';
import { 
  Code2, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  ShieldCheck, 
  Users, 
  Shield, 
  Award, 
  Building2, 
  Sliders
} from 'lucide-react';

export const ApiReferenceView: React.FC = () => {
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(API_ENDPOINTS[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const portalsList = [
    { id: 'all', label: 'All 5 Portals', icon: Code2 },
    { id: 'participant', label: '1. Participant Portal', icon: Users },
    { id: 'volunteer', label: '2. Volunteer Portal', icon: ShieldCheck },
    { id: 'sponsor', label: '3. Sponsor Portal', icon: Award },
    { id: 'partner', label: '4. Partner Portal', icon: Building2 },
    { id: 'admin', label: '5. HQ Admin Command', icon: Sliders },
  ];

  const filteredEndpoints = API_ENDPOINTS.filter(ep => {
    const matchesPortal = selectedPortal === 'all' || ep.portal === selectedPortal;
    const matchesSearch = ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ep.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ep.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPortal && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PUT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PATCH': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Code2 className="w-3.5 h-3.5" />
            <span>5 Role-Based Portal REST API Reference</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tour de Rotary DSM API Endpoints & Specifications
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            All authenticated endpoints require <code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">Authorization: Bearer &lt;Supabase_JWT&gt;</code> headers. Stakeholders only access the specific endpoints granted to their verified role.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Portal filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {portalsList.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPortal === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPortal(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search path, category or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No API endpoints match your filter.
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isExpanded = expandedId === ep.id;
            const curlSnippet = `curl -X ${ep.method} "https://api.tourderotary.co.tz${ep.path}" \\
  -H "Authorization: Bearer <SUPABASE_JWT_TOKEN>" \\
  -H "Content-Type: application/json"${
    ep.requestBody ? ` \\\n  -d '${JSON.stringify(ep.requestBody)}'` : ''
  }`;

            return (
              <div
                key={ep.id}
                className={`border rounded-2xl transition-all overflow-hidden shadow-sm ${
                  isExpanded ? 'bg-white border-blue-400 ring-1 ring-blue-400/30' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                  className="p-4 sm:p-5 cursor-pointer flex items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-black border ${getMethodBadgeClass(ep.method)}`}>
                      {ep.method}
                    </span>

                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {ep.path}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {ep.category}
                    </span>

                    {ep.authRequired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Lock className="w-3 h-3" />
                        <span>{ep.allowedRoles.join(', ')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Unlock className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden md:inline truncate max-w-xs">
                      {ep.summary}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-5 sm:p-6 bg-slate-50/70 space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Functional Description</h4>
                      <p className="text-sm text-slate-800">{ep.description}</p>
                      <p className="text-xs text-blue-700 mt-1 italic font-medium">{ep.notes}</p>
                    </div>

                    {/* Query Params if any */}
                    {ep.queryParams && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-700">Query Parameters:</div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                          {ep.queryParams.map((qp, qIdx) => (
                            <div key={qIdx} className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-blue-700 font-bold">{qp.name}</span>
                              <span className="text-slate-400">({qp.type})</span>
                              <span className="text-slate-600 font-sans">{qp.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body & Response side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {ep.requestBody && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Request Body (JSON):</span>
                            <button
                              onClick={() => handleCopy(`body-${ep.id}`, JSON.stringify(ep.requestBody, null, 2))}
                              className="p-1 rounded text-slate-500 hover:text-slate-700"
                            >
                              {copiedId === `body-${ep.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="bg-[#0F172A] rounded-xl p-3.5 border border-slate-800 overflow-x-auto">
                            <pre className="text-xs font-mono text-slate-200">
                              <code>{JSON.stringify(ep.requestBody, null, 2)}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Response Example (200/201):</span>
                          <button
                            onClick={() => handleCopy(`res-${ep.id}`, JSON.stringify(ep.responseExample, null, 2))}
                            className="p-1 rounded text-slate-500 hover:text-slate-700"
                          >
                            {copiedId === `res-${ep.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="bg-[#0F172A] rounded-xl p-3.5 border border-slate-800 overflow-x-auto">
                          <pre className="text-xs font-mono text-emerald-400">
                            <code>{JSON.stringify(ep.responseExample, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* cURL Command */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ready-to-Test cURL Snippet:</span>
                        </span>
                        <button
                          onClick={() => handleCopy(`curl-${ep.id}`, curlSnippet)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-xs text-slate-700 font-semibold border border-slate-200 shadow-sm"
                        >
                          {copiedId === `curl-${ep.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>Copy cURL</span>
                        </button>
                      </div>
                      <div className="bg-[#0F172A] rounded-xl p-3.5 border border-slate-800 overflow-x-auto">
                        <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                          <code>{curlSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
