import { supabase } from '../config/supabase.js';

/**
 * Phase Engine (proposal §03 "Phase-aware site behaviour" / journey O)
 *
 * The latest event edition's phase is derived from its configured
 * event_date and persisted to event_editions.current_phase whenever it
 * changes. The frontend (which reads Supabase directly) and every
 * phase-aware backend endpoint then pick up the right experience
 * automatically — pre-event, event_day, post_event — without a code
 * change or manual console action. HQ can still override the phase via
 * PATCH /api/v1/admin/events/phase; the engine simply corrects it as
 * the schedule passes.
 *
 * Phase window: event_day starts at flag-off (event_date) and lasts 24h
 * (configurable per edition via config_json.event_day_duration_hours).
 */
export async function runPhaseEngine() {
  try {
    const { data: edition, error } = await supabase
      .from('event_editions')
      .select('id, year, title, event_date, current_phase, config_json')
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Phase Engine] Failed to read event edition:', error.message);
      return;
    }
    if (!edition?.event_date) {
      return; // No scheduled edition yet — nothing to drive.
    }

    const now = Date.now();
    const flagOff = new Date(edition.event_date).getTime();
    const durationHours = edition.config_json?.event_day_duration_hours || 24;
    const eventDayEnd = flagOff + durationHours * 60 * 60 * 1000;

    const derivedPhase =
      now < flagOff ? 'pre_event'
      : now < eventDayEnd ? 'event_day'
      : 'post_event';

    // ── Reconcile drift EVERY cycle (audit gap 17/23) ──────────────────────
    // The original engine only wrote event_config on transitions, so any
    // manual edit to event_config or event_lifecycle (e.g. someone setting
    // archive then flipping lifecycle back to live) stayed contradictory
    // forever: config=archive while lifecycle=live. We now compare the
    // desired derived phase against BOTH satellite tables each cycle and
    // correct them in place. event_lifecycle's current_mode is derived from
    // the phase (live/memory/archive per the 002 mapping); it is only
    // corrected when it CONTRADICTS the derived phase — an explicit admin
    // memory/archive override within the pre/post windows is preserved by
    // only syncing mode when config.phase is the archive/post_event edge.
    const desiredMode =
      derivedPhase === 'archive' ? 'archive'
      : derivedPhase === 'post_event' ? 'memory'
      : 'live';

    const [configRes, lifecycleRes] = await Promise.all([
      supabase.from('event_config').select('phase').eq('id', 1).maybeSingle(),
      supabase.from('event_lifecycle').select('current_mode').limit(1).maybeSingle()
    ]);

    if (configRes.data && configRes.data.phase !== derivedPhase) {
      const { error: cfgErr } = await supabase
        .from('event_config')
        .update({ phase: derivedPhase, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (cfgErr) {
        console.error('[Phase Engine] Reconcile event_config failed:', cfgErr.message);
      } else {
        console.log(`[Phase Engine] Reconciled event_config.phase ${configRes.data.phase} -> ${derivedPhase}`);
        await supabase.from('audit_logs').insert([{
          action: 'PHASE_ENGINE_RECONCILE',
          target_resource: 'event_config:1',
          details_json: { from_phase: configRes.data.phase, to_phase: derivedPhase, derived_from: 'event_date' },
          actor_role: 'system'
        }]);
      }
    }

    // Lifecycle contradicts the derived phase ONLY when it is 'archive' or
    // 'memory' while the schedule says the event hasn't even happened — a
    // state the UI treats as no-countdown/no-registration. Live mode is the
    // default; memory/archive before flag-off are treated as drift.
    const mode = lifecycleRes.data?.current_mode;
    if (mode && mode !== desiredMode && mode !== 'live' && derivedPhase === 'pre_event') {
      const { error: lcErr } = await supabase
        .from('event_lifecycle')
        .update({ current_mode: 'live', updated_at: new Date().toISOString() })
        .neq('current_mode', 'live');
      if (lcErr) {
        console.error('[Phase Engine] Reconcile event_lifecycle failed:', lcErr.message);
      } else {
        console.log(`[Phase Engine] Reconciled event_lifecycle mode ${mode} -> live (pre_event schedule)`);
        await supabase.from('audit_logs').insert([{
          action: 'PHASE_ENGINE_RECONCILE',
          target_resource: 'event_lifecycle',
          details_json: { from_mode: mode, to_mode: 'live', reason: 'archive/memory before flag-off is drift' },
          actor_role: 'system'
        }]);
      }
    }

    if (derivedPhase !== edition.current_phase) {
      const { error: updateErr } = await supabase
        .from('event_editions')
        .update({ current_phase: derivedPhase, updated_at: new Date().toISOString() })
        .eq('id', edition.id);

      if (updateErr) {
        console.error('[Phase Engine] Failed to update phase:', updateErr.message);
        return;
      }

      // event_editions.current_phase is what this backend's own controllers
      // (cartController, campaignController, contentController,
      // volunteerController) gate on. event_config.phase is a SEPARATE row
      // in a separate table, and it's the ONLY thing the frontend
      // (tourderotary-dsm) ever reads for phase-aware behaviour — see
      // src/lib/phase.ts. Without this second write, this whole engine
      // could run forever and never change what a visitor actually sees.
      const { error: configErr } = await supabase
        .from('event_config')
        .update({ phase: derivedPhase, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (configErr) {
        console.error('[Phase Engine] Failed to sync event_config for frontend:', configErr.message);
      }

      console.log(`[Phase Engine] Edition ${edition.year} phase ${edition.current_phase} -> ${derivedPhase}`);

      await supabase.from('audit_logs').insert([{
        action: 'PHASE_ENGINE_TRANSITION',
        target_resource: `event_editions:${edition.id}`,
        details_json: { from_phase: edition.current_phase, to_phase: derivedPhase, derived_from: 'event_date' },
        actor_role: 'system'
      }]);
    }
  } catch (err) {
    console.error('[Phase Engine] Exception:', err.message || err);
  }
}
