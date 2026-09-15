import supabase from '../config/supabaseClient.js';

export const getStories = async (req, res) => {
  try {
    const { page = 1, limit = 12, featured } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('why_i_participate')
      .select('*, profiles:user_id (full_name, avatar_url)', { count: 'exact' })
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (featured === 'true') query = query.eq('is_featured', true);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching stories:', err);
    res.status(500).json({ error: 'Failed to retrieve stories' });
  }
};

export const submitStory = async (req, res) => {
  try {
    const { story_text, photo_url, discipline_tag } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });
    if (!story_text || story_text.trim().length < 20) {
      return res.status(400).json({ error: 'Story must be at least 20 characters' });
    }
    const { data, error } = await supabase
      .from('why_i_participate')
      .insert({ user_id, story_text: story_text.trim(), photo_url, discipline_tag, is_approved: false })
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You have already submitted a story' });
      throw error;
    }
    res.status(201).json({ success: true, data, message: 'Story submitted for review' });
  } catch (err) {
    console.error('Error submitting story:', err);
    res.status(500).json({ error: 'Failed to submit story' });
  }
};

export const approveStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { is_featured = false } = req.body;
    const { data, error } = await supabase
      .from('why_i_participate')
      .update({ is_approved: true, is_featured })
      .eq('id', storyId).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error approving story:', err);
    res.status(500).json({ error: 'Failed to approve story' });
  }
};
