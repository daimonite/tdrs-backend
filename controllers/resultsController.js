import supabase from '../config/supabaseClient.js';

export const getResults = async (req, res) => {
  try {
    const { page = 1, limit = 50, category_id, gender } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('triathlon_results')
      .select('*, profiles:user_id (full_name, avatar_url), category:category_id (name, discipline)', { count: 'exact' })
      .order('overall_rank', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);
    if (category_id) query = query.eq('category_id', category_id);
    if (gender) query = query.eq('gender', gender);
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
        .select('overall_rank, finish_time_seconds, profiles:user_id (full_name, avatar_url), category:category_id (name)')
        .not('finish_time_seconds', 'is', null)
        .order('overall_rank', { ascending: true })
        .limit(parseInt(limit)));
    } else if (board === 'community') {
      ({ data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, community_points')
        .not('community_points', 'is', null)
        .order('community_points', { ascending: false })
        .limit(parseInt(limit)));
    } else if (board === 'participation') {
      ({ data, error } = await supabase
        .from('registrations')
        .select('profiles:user_id (full_name, avatar_url), activity_slug, created_at')
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
      .select('*, category:category_id (name, discipline)')
      .eq('user_id', user_id).maybeSingle();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching my result:', err);
    res.status(500).json({ error: 'Failed to retrieve your result' });
  }
};
