import supabase from '../config/supabaseClient.js';

export const getPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 24, discipline, bib_number } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('race_photos')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('taken_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (discipline) query = query.eq('discipline', discipline);
    if (bib_number) query = query.contains('bib_numbers', [parseInt(bib_number)]);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ error: 'Failed to retrieve photos' });
  }
};

export const searchPhotosByBib = async (req, res) => {
  try {
    const { bib_number } = req.params;
    const bib = parseInt(bib_number);
    if (isNaN(bib)) return res.status(400).json({ error: 'Invalid bib number' });
    const { data, error } = await supabase
      .from('race_photos')
      .select('*')
      .eq('is_published', true)
      .contains('bib_numbers', [bib])
      .order('taken_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, bib_number: bib, count: (data || []).length, data: data || [] });
  } catch (err) {
    console.error('Error searching photos by bib:', err);
    res.status(500).json({ error: 'Failed to search photos' });
  }
};
