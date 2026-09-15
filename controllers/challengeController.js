import supabase from '../config/supabaseClient.js';

export const getChallenges = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { data: challenges, error } = await supabase
      .from('pre_race_challenges').select('*').eq('is_active', true).order('created_at', { ascending: true });
    if (error) throw error;
    let userStatuses = {};
    if (user_id && challenges && challenges.length > 0) {
      const { data: uc } = await supabase
        .from('user_challenges').select('challenge_id, status, completed_at')
        .eq('user_id', user_id).in('challenge_id', challenges.map(c => c.id));
      (uc || []).forEach(u => { userStatuses[u.challenge_id] = u; });
    }
    const enriched = (challenges || []).map(c => ({ ...c, user_status: userStatuses[c.id] || null }));
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
    const { proof_url } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString(), proof_url: proof_url || null })
      .eq('challenge_id', challengeId).eq('user_id', user_id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Challenge not found or not joined' });
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
      .select('completed_at, profiles:user_id (full_name, avatar_url)')
      .eq('challenge_id', challengeId).eq('status', 'completed').not('completed_at', 'is', null)
      .order('completed_at', { ascending: true }).limit(parseInt(limit));
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Error fetching challenge leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve challenge leaderboard' });
  }
};
