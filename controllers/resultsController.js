import supabase from '../config/supabase.js';

export const getResults = async (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('triathlon_results')
      .select('*, profiles:user_id (full_name)', { count: 'exact' })
      .order('rank_overall', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);
    if (category) query = query.eq('category_slug', category);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ error: 'Failed to retrieve results' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const { board = 'performance', limit = 20 } = req.query;
    let data, error;

    if (board === 'performance') {
      ({ data, error } = await supabase
        .from('triathlon_results')
        .select('rank_overall, rank_category, total_time_seconds, swim_time_seconds, bike_time_seconds, run_time_seconds, athlete_name, profiles:user_id (full_name)')
        .not('total_time_seconds', 'is', null)
        .eq('status', 'finished')
        .order('rank_overall', { ascending: true })
        .limit(parseInt(limit)));
    } else if (board === 'community' || board === 'teams') {
      // COMMUNITY board: biggest teams (member_count is kept in sync by
      // teamController on every join/leave).
      ({ data, error } = await supabase
        .from('teams')
        .select('name, slug, team_type, is_relay, member_count, captain:captain_id (full_name)')
        .order('member_count', { ascending: false })
        .limit(parseInt(limit)));
    } else if (board === 'participation') {
      // PARTICIPATION board: most recent participants joining the movement.
      ({ data, error } = await supabase
        .from('registrations')
        .select('profiles:user_id (full_name), activity_slug, created_at')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit)));
    } else {
      return res.status(400).json({ error: 'Invalid board type. Use: performance, community, or participation' });
    }

    if (error) throw error;
    res.json({ success: true, board, data: data || [] });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
};

export const getMyResult = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });
    const { data, error } = await supabase
      .from('triathlon_results')
      .select('*')
      .eq('user_id', user_id).maybeSingle();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching my result:', err);
    res.status(500).json({ error: 'Failed to retrieve your result' });
  }
};
