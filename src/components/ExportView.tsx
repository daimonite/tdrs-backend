import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FolderArchive, 
  Terminal, 
  FileCode2, 
  ExternalLink, 
  ShieldCheck, 
  FileCheck2,
  Server,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';

export const ExportView: React.FC = () => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);

  const envContent = `# ==============================================================================
# TOUR DE ROTARY DSM 2026 - PRODUCTION ENVIRONMENT CONFIGURATION
# Copy this file to .env and fill in your credentials
# ==============================================================================

# --- Server & Runtime ---
PORT=8800
NODE_ENV=production
APP_URL=https://api.tourderotary.co.tz

# --- Supabase / PostgreSQL 16 Database ---
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:your_db_password@db.your_supabase_ref.supabase.co:5432/postgres
SUPABASE_URL=https://your_supabase_ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key

# --- PayMe Africa (Mobile Money: M-Pesa, Tigo Pesa, Airtel Money) ---
PAYME_API_KEY=your_payme_africa_live_api_key
PAYME_WEBHOOK_SECRET=your_payme_webhook_hmac_sha256_secret
PAYME_API_URL=https://api.payme.africa/v1
PAYME_MERCHANT_CODE=ROTARY_DSM_2026
PAYME_DEFAULT_CURRENCY=TZS

# --- Textify Africa (Automated SMS Alerts, QR Passes & Day 4/6 Warnings) ---
TEXTIFY_API_KEY=your_textify_africa_api_key
TEXTIFY_SENDER_ID=ROTARY-DSM
TEXTIFY_API_URL=https://api.textify.africa/v1/sms/send

# --- Resend / Transactional Email Service ---
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="Tour de Rotary DSM <tickets@tourderotary.co.tz>"
SUPPORT_EMAIL=info@tourderotary.co.tz

# --- Strava API / Athlete Fitness Progress Tracking ---
STRAVA_CLIENT_ID=your_strava_app_client_id
STRAVA_CLIENT_SECRET=your_strava_app_client_secret
STRAVA_REDIRECT_URI=https://api.tourderotary.co.tz/api/v1/fitness/strava/callback

# --- Security, Authentication & Role-Based Access Control (RBAC) ---
JWT_SECRET=your_256bit_jwt_signing_secret_key
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your_aes_256_encryption_key_for_qr_tokens`;

  const gitCommands = `# 1. Extract the downloaded zip file
unzip tourderotary-dsm-backend.zip
cd tourderotary-dsm-backend

# 2. Setup your environment variables
cp .env.example .env
# Edit .env with your favorite editor (e.g. nano .env or code .env)

# 3. Initialize and push to your GitHub repo
git init
git add .
git commit -m "feat: complete production backend for Tour de Rotary DSM 2026"
git branch -M main
git remote add origin https://github.com/smart01-bot/tourderotary-dsm.git
git push -u origin main`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleCopyGit = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 2000);
  };

  const archiveContents = [
    { path: 'index.js', desc: 'Main Express 5 API server entry point with CORS, helmet, and workers' },
    { path: 'controllers/', desc: '16 complete controllers covering cart, merchandise, payments, QR tickets, social twibbon, comms, Schedule C, and admin' },
    { path: 'routes/', desc: 'REST endpoints configured for public, participant, volunteer, sponsor, partner, admin, and evaluation' },
    { path: 'migrations/001_tour_de_rotary_schema.sql', desc: 'Complete PostgreSQL schema: 9 tables, indexes, UUIDs, RLS, and status triggers' },
    { path: 'migrations/002_extended_scope_tables.sql', desc: 'Extended tables for campaigns, comms templates, twibbon shares, and Schedule C surveys' },
    { path: 'seeds/001_seed_rotary_2026.sql', desc: 'Pre-seeded 2026 Edition: activities (Cyclathon 60km, Marathon 21km, etc.), inventory & pricing' },
    { path: 'middleware/', desc: 'Role-based access control (RBAC), HMAC-SHA256 signature verification, validation guards' },
    { path: 'services/', desc: 'PayMe mobile money client, Textify SMS dispatcher, inventory reservation workers' },
    { path: 'config/', desc: 'Database & Supabase connection management with resilient offline fallbacks' },
    { path: 'Dockerfile & docker-compose.yml', desc: 'Production-ready container configuration with Node 20 LTS' },
    { path: '.env.example', desc: 'Clean template containing every variable definition with helpful placeholders' },
    { path: 'package.json', desc: 'Configured dependencies with start, dev, test, and lint scripts' },
    { path: 'README.md', desc: 'Comprehensive documentation, Schedule A & C mapping matrix, API directory, and deployment guides' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-blue-900/50 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <FolderArchive className="w-3.5 h-3.5" />
              Repository Export Package
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Export Backend for <span className="text-blue-400">smart01-bot</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Download the complete, self-contained Tour de Rotary DSM 2026 backend codebase. All external credentials remain in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">.env.example</code> for you to fill in your own variables at the end.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/tourderotary-dsm-backend.zip"
              download="tourderotary-dsm-backend.zip"
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Download ZIP (144 KB)
            </a>
            <a
              href="/tourderotary-dsm-backend.tar.gz"
              download="tourderotary-dsm-backend.tar.gz"
              className="inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
            >
              <Download className="w-4 h-4" />
              Download tar.gz (120 KB)
            </a>
          </div>
        </div>
      </div>

      {/* Target Repo & Quick Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: GitHub Push Instructions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-900 text-white">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Push to GitHub Repository</h3>
                  <a 
                    href="https://github.com/smart01-bot/tourderotary-dsm" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-mono"
                  >
                    smart01-bot/tourderotary-dsm
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <button
                onClick={handleCopyGit}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copiedGit ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedGit ? 'Copied!' : 'Copy Script'}
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-xs font-mono text-slate-200 border border-slate-800 leading-relaxed">
              <pre>{gitCommands}</pre>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Safe for public repositories: No secret keys or passwords are packaged in the archive.</span>
            </div>
          </div>

          {/* Archive File Manifest */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              Package File Manifest
            </h3>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {archiveContents.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <span className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0">
                    {item.path}
                  </span>
                  <span className="text-slate-500 text-right">
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Environment Variables (.env.example) */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Environment Template (.env.example)</h3>
                  <p className="text-xs text-slate-500">Enter your real credentials in this file once exported</p>
                </div>
              </div>
              <button
                onClick={handleCopyEnv}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEnv ? 'Copied to Clipboard!' : 'Copy .env'}
              </button>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-y-auto max-h-[580px] text-xs font-mono text-slate-200 border border-slate-800 leading-relaxed">
              <pre>{envContent}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Variables count: 18</span>
              <span className="text-blue-600 font-medium">Ready for deployment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
