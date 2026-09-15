import supabase from '../config/supabaseClient.js';

export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, discipline, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('community_posts')
      .select('*, profiles:author_id (full_name, avatar_url)', { count: 'exact' })
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (discipline) query = query.eq('discipline_tag', discipline);
    if (type) query = query.eq('post_type', type);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to retrieve community posts' });
  }
};

export const createPost = async (req, res) => {
  try {
    const { content, post_type = 'training', discipline_tag, media_urls = [] } = req.body;
    const author_id = req.user?.id;
    if (!author_id) return res.status(401).json({ error: 'Authentication required' });
    if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Post content is required' });
    const { data, error } = await supabase
      .from('community_posts')
      .insert({ author_id, content: content.trim(), post_type, discipline_tag, media_urls })
      .select('*, profiles:author_id (full_name, avatar_url)')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const reactToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reaction_type = 'like' } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });
    const { data: existing } = await supabase
      .from('post_reactions').select('id')
      .eq('post_id', postId).eq('user_id', user_id).eq('reaction_type', reaction_type).maybeSingle();
    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id);
      return res.json({ success: true, action: 'removed' });
    }
    const { error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id, reaction_type });
    if (error) throw error;
    res.json({ success: true, action: 'added' });
  } catch (err) {
    console.error('Error toggling reaction:', err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parent_comment_id } = req.body;
    const author_id = req.user?.id;
    if (!author_id) return res.status(401).json({ error: 'Authentication required' });
    if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Comment content is required' });
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id, content: content.trim(), parent_comment_id: parent_comment_id || null })
      .select('*, profiles:author_id (full_name, avatar_url)').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { data, error } = await supabase
      .from('post_comments').select('*, profiles:author_id (full_name, avatar_url)')
      .eq('post_id', postId).is('parent_comment_id', null).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to retrieve comments' });
  }
};
