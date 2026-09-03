import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, 
  CreditCard, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Award, 
  Building2, 
  Sliders,
  Sparkles,
  Smartphone,
  Mail,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SimulatorsView: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<'payme' | 'reservation' | 'phase' | 'rbac'>('payme');

  // --- ENGINE 1: PAYME AFRICA WEBHOOK STATE ---
  const [orderNumber, setOrderNumber] = useState('TDR-2026-89412');
  const [amountTsh, setAmountTsh] = useState(75000);
  const [channel, setChannel] = useState<'M-Pesa' | 'Tigo Pesa' | 'Airtel Money'>('M-Pesa');
  const [customerPhone, setCustomerPhone] = useState('+255714000111');
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [ticketsGenerated, setTicketsGenerated] = useState<any[]>([]);

  const handleSimulatePayMeWebhook = (isRetry = false) => {
    setIsProcessingWebhook(true);
    const logPrefix = `[${new Date().toLocaleTimeString()}]`;

    if (isRetry && paymentCompleted) {
      setTimeout(() => {
        setWebhookLogs(prev => [
          `${logPrefix} ⚠️ Idempotency Trigger: Payment with idempotency_key already committed. Returning 200 OK (alreadyProcessed: true) - 0 duplicate tickets generated.`,
          ...prev
        ]);
        setIsProcessingWebhook(false);
      }, 500);
      return;
    }

    setTimeout(() => {
      setWebhookLogs(prev => [
        `${logPrefix} 📥 Incoming POST /api/v1/payments/payme/webhook payload received`,
        `${logPrefix} 🔐 HMAC SHA-256 Signature verified using PAYME_SECRET_KEY`,
        `${logPrefix} 💾 PostgreSQL Transaction: UPDATE orders SET status = 'paid' WHERE order_number = '${orderNumber}'`,
        `${logPrefix} 🎫 Generated 1x Cyclathon 60km QR Entry Pass (BIB: CYC-2026-042)`,
        `${logPrefix} 📱 Textify Africa SMS Queued -> ${customerPhone}: "Hongera! Your Tour de Rotary 2026 entry is confirmed."`,
        `${logPrefix} 📧 Resend Email Queued with printable PDF Ticket attachment`,
        ...prev
      ]);
      setPaymentCompleted(true);
      setTicketsGenerated([
        {
          id: 'tkt_8910',
          bib: 'CYC-2026-042',
          activity: 'Cyclathon 60km Pro Tour',
          qrToken: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
          name: 'Juma Mwamburi'
        }
      ]);
      setIsProcessingWebhook(false);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    }, 900);
  };

  const handleResetPayme = () => {
    setPaymentCompleted(false);
    setWebhookLogs([]);
    setTicketsGenerated([]);
  };

  // --- ENGINE 2: 7-DAY RESERVATION ENGINE STATE ---
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [stockTotal, setStockTotal] = useState<number>(50);
  const [reservedCount, setReservedCount] = useState<number>(10);
  const [reservationStatus, setReservationStatus] = useState<'active' | 'expired_released' | 'paid'>('active');
  const [reservationLogs, setReservationLogs] = useState<string[]>([
    '[Day 0] Participant reserved 1x Official Tour Jersey (Size L). 10 units locked in inventory_reservations table.'
  ]);

  const handleAdvanceDay = (day: number) => {
    setCurrentDay(day);
    const logPrefix = `[Day ${day}]`;

    if (day === 4) {
      setReservationLogs(prev => [
        `${logPrefix} ⏰ Cron Trigger: Day 4 reached. Textify Africa SMS dispatched: "Jambo Juma, your jersey reservation expires in 3 days. Complete checkout now."`,
        ...prev
      ]);
    } else if (day === 6) {
      setReservationLogs(prev => [
        `${logPrefix} ⚠️ Cron Trigger: Day 6 reached. FINAL SMS NOTICE dispatched: "Warning: Reservation will be automatically released tomorrow at midnight."`,
        ...prev
      ]);
    } else if (day === 7) {
      if (reservationStatus === 'active') {
        setReservationStatus('expired_released');
        setReservedCount(prev => Math.max(0, prev - 1));
        setReservationLogs(prev => [
          `${logPrefix} 🔴 Day 7 Hard Deadline Reached! Auto-Release worker ran: 1 unit returned to available stock. Status updated to 'expired_released'.`,
          ...prev
        ]);
      }
    }
  };

  const handleResetReservation = () => {
    setCurrentDay(0);
    setReservedCount(10);
    setReservationStatus('active');
    setReservationLogs([
      '[Day 0] Participant reserved 1x Official Tour Jersey (Size L). 10 units locked in inventory_reservations table.'
    ]);
  };

  // --- ENGINE 3: PHASE ENGINE STATE ---
  const [currentPhase, setCurrentPhase] = useState<'pre_event' | 'event_day' | 'post_event'>('pre_event');
  const [phaseLog, setPhaseLog] = useState<string>('Platform is currently accepting registrations, early-bird tickets, and training sync.');

  const handleSwitchPhase = (phase: 'pre_event' | 'event_day' | 'post_event') => {
    setCurrentPhase(phase);
    if (phase === 'pre_event') {
      setPhaseLog('Switched to Pre-Event Mode: Discovery, mixed cart registrations, and merchandise reservation active.');
    } else if (phase === 'event_day') {
      setPhaseLog('Switched to Event-Day Mode (1 Nov 2026): Gate QR ticket check-in scanners active, 05:00 AM briefing SMS dispatched, live incident logging enabled.');
    } else {
      setPhaseLog('Switched to Post-Event M&E Mode: Digital collectible certificates generated with public QR verify, photo gallery live, and M&E reports exportable.');
    }
  };

  // --- ENGINE 4: RBAC GATE SIMULATOR ---
  const [selectedRole, setSelectedRole] = useState<'participant' | 'volunteer' | 'sponsor' | 'partner' | 'admin'>('participant');
  const [targetEndpoint, setTargetEndpoint] = useState<string>('/api/v1/volunteer/checkin-ticket');
  const [authCheckResult, setAuthCheckResult] = useState<{ allowed: boolean; message: string; httpCode: number } | null>(null);

  const testEndpoints = [
    { path: '/api/v1/participant/tickets', requiredRoles: ['participant', 'admin'], title: 'View My Tickets & QR Pass' },
    { path: '/api/v1/volunteer/checkin-ticket', requiredRoles: ['volunteer', 'admin'], title: 'Volunteer QR Gate Check-In' },
    { path: '/api/v1/sponsor/assets/upload', requiredRoles: ['sponsor', 'admin'], title: 'Sponsor High-Res Banner Upload' },
    { path: '/api/v1/partner/tasks/submit', requiredRoles: ['partner', 'admin'], title: 'Partner Logistics Clearance' },
    { path: '/api/v1/admin/events/phase', requiredRoles: ['admin'], title: 'HQ Admin Phase Switch Engine' },
  ];

  const handleTestAuthGate = () => {
    const ep = testEndpoints.find(e => e.path === targetEndpoint);
    if (!ep) return;

    const isAllowed = ep.requiredRoles.includes(selectedRole);
    if (isAllowed) {
      setAuthCheckResult({
        allowed: true,
        httpCode: 200,
        message: `✅ Access Granted (200 OK): Role "${selectedRole}" has permission to invoke ${ep.path}.`
      });
    } else {
      setAuthCheckResult({
        allowed: false,
        httpCode: 403,
        message: `🚫 Access Denied (403 Forbidden): Role "${selectedRole}" is not authorized. Allowed roles: [${ep.requiredRoles.join(', ')}].`
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Interactive Backend Simulators</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tour de Rotary DSM Backend Execution Playground
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Test core backend behaviors: PayMe Africa idempotent webhooks, 7-day apparel reservation locking & release, Event Phase transitions, and 5-Role RBAC gateway enforcement.
            </p>
          </div>

          {/* Engine Selector Pills */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto flex-wrap gap-1">
            <button
              onClick={() => setActiveEngine('payme')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                activeEngine === 'payme' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. PayMe Webhook
            </button>
            <button
              onClick={() => setActiveEngine('reservation')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                activeEngine === 'reservation' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. 7-Day Stock Lock
            </button>
            <button
              onClick={() => setActiveEngine('phase')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                activeEngine === 'phase' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Phase Engine
            </button>
            <button
              onClick={() => setActiveEngine('rbac')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                activeEngine === 'rbac' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4. 5-Role RBAC Gate
            </button>
          </div>
        </div>
      </div>

      {/* ENGINE 1: PAYME AFRICA WEBHOOK SIMULATOR */}
      {activeEngine === 'payme' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Simulate PayMe Africa Webhook</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Trigger server-to-server callback when participant completes mobile money payment on M-Pesa / Tigo Pesa.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Order Number:</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (TSh):</label>
                  <input
                    type="number"
                    value={amountTsh}
                    onChange={(e) => setAmountTsh(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Channel:</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="M-Pesa">Vodacom M-Pesa</option>
                    <option value="Tigo Pesa">Tigo Pesa</option>
                    <option value="Airtel Money">Airtel Money</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Phone (SMS Recipient):</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleSimulatePayMeWebhook(false)}
                disabled={isProcessingWebhook}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {isProcessingWebhook ? 'Processing ACID Transaction...' : 'Send PayMe Webhook (Success)'}
              </button>

              <button
                onClick={() => handleSimulatePayMeWebhook(true)}
                disabled={!paymentCompleted || isProcessingWebhook}
                className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-200 transition-all disabled:opacity-40"
              >
                <span>Simulate Webhook Retry (Test Idempotency)</span>
              </button>

              <button
                onClick={handleResetPayme}
                className="w-full py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Reset Simulator
              </button>
            </div>
          </div>

          {/* Telemetry & Output */}
          <div className="lg:col-span-7 space-y-4">
            {/* Generated Ticket Card if paid */}
            {ticketsGenerated.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                    TICKET ISSUED
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-900">BIB: {ticketsGenerated[0].bib}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-emerald-200 rounded-xl p-2 flex items-center justify-center shadow-inner">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{ticketsGenerated[0].activity}</h4>
                    <p className="text-xs text-slate-600">Participant: {ticketsGenerated[0].name}</p>
                    <p className="text-[11px] font-mono text-emerald-700 truncate max-w-xs mt-0.5">
                      QR Token: {ticketsGenerated[0].qrToken.substring(0, 24)}...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Server Execution Logs */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Backend Execution Logs</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{webhookLogs.length} events</span>
              </div>

              <div className="h-64 overflow-y-auto font-mono text-xs space-y-2 text-slate-300 pr-2">
                {webhookLogs.length === 0 ? (
                  <div className="text-slate-500 italic py-12 text-center">
                    Click "Send PayMe Webhook" to execute the payment pipeline.
                  </div>
                ) : (
                  webhookLogs.map((log, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENGINE 2: 7-DAY RESERVATION ENGINE */}
      {activeEngine === 'reservation' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>7-Day Merchandise Reservation & Release Engine</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Apparel inventory is temporarily locked upon reservation. If unpaid, Day 4 & Day 6 SMS reminders are sent, and stock is auto-released on Day 7.
              </p>
            </div>
            <button
              onClick={handleResetReservation}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
            >
              Reset Cycle
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 4, 6, 7].map((day) => (
              <button
                key={day}
                onClick={() => handleAdvanceDay(day)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  currentDay === day
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                    : currentDay > day
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">Day {day}</div>
                <div className="text-xs font-semibold mt-0.5">
                  {day === 0 ? 'Item Reserved' : day === 4 ? 'Day 4 SMS' : day === 6 ? 'Day 6 Final' : 'Day 7 Release'}
                </div>
              </button>
            ))}
          </div>

          {/* Status Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 font-medium">Available Inventory</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {stockTotal - reservedCount} / {stockTotal} Units
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 font-medium">Reserved Stock (Locked)</div>
              <div className="text-xl font-bold text-amber-600 font-mono mt-1">
                {reservedCount} Units
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 font-medium">Reservation Status</div>
              <div className={`text-base font-bold font-mono mt-1 uppercase ${
                reservationStatus === 'active' ? 'text-blue-600' : 'text-rose-600'
              }`}>
                {reservationStatus}
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-[#0F172A] rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 pb-2">
              Timeline & Automated Worker Events:
            </div>
            {reservationLogs.map((log, lIdx) => (
              <div key={lIdx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENGINE 3: PHASE ENGINE */}
      {activeEngine === 'phase' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Annual Event Phase Switcher</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Switch the platform's active operating mode to observe dynamic endpoint behaviors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleSwitchPhase('pre_event')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                currentPhase === 'pre_event'
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">PHASE 1</span>
              <h4 className="font-bold text-slate-900 mt-2 text-sm">Pre-Event Mode</h4>
              <p className="text-xs text-slate-600 mt-1">Discovery, mixed-cart checkout & merchandise reservations active.</p>
            </button>

            <button
              onClick={() => handleSwitchPhase('event_day')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                currentPhase === 'event_day'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">PHASE 2</span>
              <h4 className="font-bold text-slate-900 mt-2 text-sm">Event-Day Mode (1 Nov)</h4>
              <p className="text-xs text-slate-600 mt-1">Live gate QR scanning, emergency broadcasts & volunteer coordination.</p>
            </button>

            <button
              onClick={() => handleSwitchPhase('post_event')}
              className={`p-5 rounded-2xl border text-left transition-all ${
                currentPhase === 'post_event'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">PHASE 3</span>
              <h4 className="font-bold text-slate-900 mt-2 text-sm">Post-Event M&E Mode</h4>
              <p className="text-xs text-slate-600 mt-1">Digital certificates, QR verification authenticity & annual reset cloning.</p>
            </button>
          </div>

          <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs flex items-center gap-2">
            <span className="text-blue-400 font-bold">[Phase State Engine]:</span>
            <span>{phaseLog}</span>
          </div>
        </div>
      )}

      {/* ENGINE 4: 5-ROLE RBAC GATE INSPECTOR */}
      {activeEngine === 'rbac' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>5-Role RBAC Authorization Gate</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Select an active user role and test invoking restricted portal endpoints.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role & Endpoint Selection */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">1. Active JWT Token Role:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['participant', 'volunteer', 'sponsor', 'partner', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setSelectedRole(r); setAuthCheckResult(null); }}
                      className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all ${
                        selectedRole === r
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">2. Target Endpoint to Invoke:</label>
                <div className="space-y-1.5">
                  {testEndpoints.map((ep) => (
                    <div
                      key={ep.path}
                      onClick={() => { setTargetEndpoint(ep.path); setAuthCheckResult(null); }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        targetEndpoint === ep.path
                          ? 'bg-blue-50 border-blue-500 font-bold text-blue-950 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-xs">{ep.path}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{ep.title}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">
                        {ep.requiredRoles.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTestAuthGate}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                Execute RBAC Authorization Check
              </button>
            </div>

            {/* Results Panel */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 text-white space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Middleware Decision</span>
                  {authCheckResult && (
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      authCheckResult.allowed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      HTTP {authCheckResult.httpCode}
                    </span>
                  )}
                </div>

                {authCheckResult ? (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    authCheckResult.allowed 
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}>
                    {authCheckResult.message}
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs italic py-12 text-center">
                    Select a role and target endpoint, then click "Execute RBAC Authorization Check".
                  </div>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800">
                Rule: Supabase JWT payload contains <code className="text-blue-400">app_metadata.role</code> verified by PostgreSQL RLS and Edge Function middlewares.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
