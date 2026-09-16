import supabase from '../config/supabase.js';

// Schema: migration 017 `digital_bibs`:
// user_id, bib_number (TEXT UNIQUE), athlete_name (NOT NULL),
// category_name (NOT NULL), team_name, qr_code_data (NOT NULL),
// rendered_image_url, share_slug (UNIQUE NOT NULL), is_claimed.
// NOTE: generateBib was originally written for columns that don't exist
// (category_id / generated_at / onConflict:'user_id' without a matching
// unique index) — every call 500'd. Rewritten for the real schema.

export const getBib = async (req, res) => {
  try {
    const { identifier } = req.params;
    let query = supabase.from('digital_bibs').select('*, profiles:user_id (full_name, avatar_url)');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      query = query.eq('user_id', identifier);
    } else if (/^\d+$/.test(identifier)) {
      query = query.eq('bib_number', identifier);
    } else {
      query = query.eq('share_slug', identifier);
    }
    const { data, error } = await query.maybeSingle();
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

// Admin-only (see routes/bibRoutes.js): issues a bib for a participant.
export const generateBib = async (req, res) => {
  try {
    const { user_id, bib_number, athlete_name, category_name, team_name } = req.body;
    if (!user_id || !bib_number || !athlete_name || !category_name) {
      return res.status(400).json({ error: 'user_id, bib_number, athlete_name and category_name are required' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
      return res.status(400).json({ error: 'user_id must be a UUID' });
    }
    const share_slug = 'bib-' + String(bib_number).toLowerCase() + '-' + Date.now().toString(36);
    const qr_code_data = JSON.stringify({ type: 'tour-de-dar-bib', bib_number: String(bib_number), share_slug });
    const { data, error } = await supabase
      .from('digital_bibs')
      .upsert(
        { user_id, bib_number: String(bib_number), athlete_name, category_name, team_name: team_name || null, share_slug, qr_code_data },
        { onConflict: 'user_id' }
      )
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'That bib number is already taken' });
      throw error;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error generating bib:', err);
    res.status(500).json({ error: 'Failed to generate bib' });
  }
};
