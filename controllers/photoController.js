import supabase from '../config/supabase.js';

// Schema: migration 017 `race_photos`:
// image_url, thumb_url, discipline (swim|bike|run|finish|awards|general),
// checkpoint_name, bib_numbers TEXT[] (GIN-indexed), photographer, taken_at.
// There is no is_published column — every row in the table is published by
// definition. The GIN index on bib_numbers powers the "FIND ME IN THE RACE"
// search (§14).

export const getPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 24, discipline, bib_number } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('race_photos')
      .select('*', { count: 'exact' })
      .order('taken_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (discipline) query = query.eq('discipline', discipline);
    if (bib_number) query = query.contains('bib_numbers', [String(bib_number)]);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil((count || 0) / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ error: 'Failed to retrieve photos' });
  }
};

export const searchPhotosByBib = async (req, res) => {
  try {
    const { bib_number } = req.params;
    if (!/^\d+$/.test(bib_number)) return res.status(400).json({ error: 'Invalid bib number' });
    const { data, error } = await supabase
      .from('race_photos')
      .select('*')
      .contains('bib_numbers', [bib_number])
      .order('taken_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, bib_number, count: (data || []).length, data: data || [] });
  } catch (err) {
    console.error('Error searching photos by bib:', err);
    res.status(500).json({ error: 'Failed to search photos' });
  }
};
