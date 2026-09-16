import supabase from '../config/supabase.js';

// Schema: migration 017 `challenges` / `user_challenges`.
// - challenges: discipline (swim|bike|run|community|general), start_date/end_date
//   (DATE), completion_count, badge_name/badge_icon.
// - user_challenges: status ('joined'|'in_progress'|'completed'), progress_value,
//   UNIQUE (user_id, challenge_id).
// NOTE: this controller was originally written against a phantom
// `pre_race_challenges` table that exists in no migration — every endpoint
// 500'd even after migration 017 is applied. Aligned to the real schema.

export const getChallenges = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const today = new Date().toISOString().slice(0, 10);
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('end_date', { ascending: true });
    if (error) throw error;
    let userStatuses = {};
    if (user_id && challenges && challenges.length > 0) {
      const { data: uc } = await supabase
        .from('user_challenges').select('challenge_id, status, progress_value, completed_at')
        .eq('user_id', user_id).in('challenge_id', challenges.map(c => c.id));
      (uc || []).forEach(u => { userStatuses[u.challenge_id] = u; });
    }
    const enriched = (challenges || []).map(c => ({
      ...c,
      is_open: true,
      user_status: userStatuses[c.id] || null
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Error fetching challenges:', err);
    res.status(500).json({ error: 'Failed to retrieve challenges' });
  }
};

export const joinChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });

    const { data: challenge } = await supabase
      .from('challenges').select('id, title, end_date').eq('id', challengeId).maybeSingle();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    const today = new Date().toISOString().slice(0, 10);
    if (today > challenge.end_date) return res.status(409).json({ error: 'This challenge has already ended' });

    const { data, error } = await supabase
      .from('user_challenges').insert({ challenge_id: challengeId, user_id, status: 'joined' }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You have already joined this challenge' });
      throw error;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error joining challenge:', err);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
};

export const completeChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { progress_value } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });

    const { data, error } = await supabase
      .from('user_challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString(), progress_value: progress_value != null ? progress_value : 1 })
      .eq('challenge_id', challengeId).eq('user_id', user_id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Challenge not found or not joined' });

    // §9 — "Completion count": increment the challenge's denormalized counter.
    const { error: rpcError } = await supabase.rpc('increment_challenge_completion', { challenge_id: challengeId });
    if (rpcError) console.error('completion_count increment failed:', rpcError.message);

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error completing challenge:', err);
    res.status(500).json({ error: 'Failed to mark challenge as complete' });
  }
};

export const getChallengeLeaderboard = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { limit = 50 } = req.query;
    const { data, error } = await supabase
      .from('user_challenges')
      .select('completed_at, profiles:user_id (full_name)')
      .eq('challenge_id', challengeId).eq('status', 'completed').not('completed_at', 'is', null)
      .order('completed_at', { ascending: true }).limit(parseInt(limit));
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Error fetching challenge leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve challenge leaderboard' });
  }
};
