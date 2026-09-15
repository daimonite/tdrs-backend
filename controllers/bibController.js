import supabase from '../config/supabaseClient.js';

export const getBib = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isUUID = /^[0-9a-f-]{36}$/.test(identifier);
    const query = isUUID
      ? supabase.from('digital_bibs').select('*, profiles:user_id (full_name, avatar_url)').eq('user_id', identifier).maybeSingle()
      : supabase.from('digital_bibs').select('*, profiles:user_id (full_name, avatar_url)').eq('share_slug', identifier).maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Bib not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching bib:', err);
    res.status(500).json({ error: 'Failed to retrieve bib' });
  }
};

export const getMyBib = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });
    const { data, error } = await supabase
      .from('digital_bibs').select('*').eq('user_id', user_id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No bib found. Complete registration to receive your bib.' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching my bib:', err);
    res.status(500).json({ error: 'Failed to retrieve your bib' });
  }
};

export const generateBib = async (req, res) => {
  try {
    const { user_id, bib_number, category_id, category_name } = req.body;
    if (!user_id || !bib_number) return res.status(400).json({ error: 'user_id and bib_number are required' });
    const share_slug = 'bib-' + bib_number + '-' + Date.now().toString(36);
    const { data, error } = await supabase
      .from('digital_bibs')
      .upsert({ user_id, bib_number, category_id, category_name, share_slug, generated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error generating bib:', err);
    res.status(500).json({ error: 'Failed to generate bib' });
  }
};
