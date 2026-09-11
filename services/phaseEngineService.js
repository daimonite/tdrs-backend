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
