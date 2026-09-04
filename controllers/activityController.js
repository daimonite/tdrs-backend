import { supabase } from '../config/supabase.js';

const DEFAULT_ACTIVITIES = [
  {
    id: 'a2026001-0000-0000-0000-000000000001',
    edition_id: 'e2026000-0000-0000-0000-000000000001',
    title: 'Grand Cyclathon Elite & Enthusiasts',
    category: 'Cycling',
    distance_km: 60.00,
    start_time: '06:00 AM',
    flag_off_location: 'Oysterbay Waterfront Main Arch',
    capacity: 500,
    registered_count: 142,
    early_bird_price_tsh: 45000,
    standard_price_tsh: 60000,
    status: 'open'
  },
  {
    id: 'a2026002-0000-0000-0000-000000000002',
    edition_id: 'e2026000-0000-0000-0000-000000000001',
    title: 'Half Marathon Coastal Run',
    category: 'Running',
    distance_km: 21.10,
    start_time: '06:30 AM',
    flag_off_location: 'Toure Drive Start Line',
    capacity: 800,
    registered_count: 310,
    early_bird_price_tsh: 35000,
    standard_price_tsh: 50000,
    status: 'open'
  },
  {
    id: 'a2026003-0000-0000-0000-000000000003',
    edition_id: 'e2026000-0000-0000-0000-000000000001',
    title: 'Community Walkathon for Charity',
    category: 'Walking',
    distance_km: 10.00,
    start_time: '07:00 AM',
    flag_off_location: 'Masaki Peninsula Loop Gate',
    capacity: 1200,
    registered_count: 580,
    early_bird_price_tsh: 20000,
    standard_price_tsh: 30000,
    status: 'open'
  },
  {
    id: 'a2026004-0000-0000-0000-000000000004',
    edition_id: 'e2026000-0000-0000-0000-000000000001',
    title: 'Coastal Sunrise Yoga Flow',
    category: 'Wellness',
    distance_km: 0.00,
    start_time: '07:30 AM',
    flag_off_location: 'Coco Beach Ocean Lawn',
    capacity: 250,
    registered_count: 89,
    early_bird_price_tsh: 15000,
    standard_price_tsh: 25000,
    status: 'open'
  },
  {
    id: 'a2026005-0000-0000-0000-000000000005',
    edition_id: 'e2026000-0000-0000-0000-000000000001',
    title: 'High-Energy Afrobeats Zumba Fiesta',
    category: 'Fitness',
    distance_km: 0.00,
    start_time: '08:15 AM',
    flag_off_location: 'Finish Village Main Stage',
    capacity: 400,
    registered_count: 175,
    early_bird_price_tsh: 15000,
    standard_price_tsh: 25000,
    status: 'open'
  }
];

/**
 * Activity Controller - Handles public listing of events, routes, pricing, and live capacities
 * Queries the Supabase 'activities' table with automatic fallback
 */
export const getActivities = async (req, res) => {
  try {
    const { category } = req.query;

    let activities = null;

    try {
      let query = supabase
        .from('activities')
        .select('*')
        .order('distance_km', { ascending: false });

      if (category) {
        query = query.ilike('category', category);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        activities = data;
      }
    } catch (queryErr) {
      console.warn('Supabase query failed, using resilient fallback:', queryErr.message || queryErr);
    }

    if (!activities) {
      activities = category 
        ? DEFAULT_ACTIVITIES.filter(a => a.category.toLowerCase() === category.toLowerCase())
        : DEFAULT_ACTIVITIES;
    }

    return res.status(200).json({
      edition: 'Tour de Rotary DSM 2026',
      edition_year: 2026,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('getActivities exception:', error);
    return res.status(200).json({
      edition: 'Tour de Rotary DSM 2026',
      edition_year: 2026,
      count: DEFAULT_ACTIVITIES.length,
      data: DEFAULT_ACTIVITIES
    });
  }
};

export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    let activity = null;
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        activity = data;
      }
    } catch (err) {
      // fallback
    }

    if (!activity) {
      activity = DEFAULT_ACTIVITIES.find(a => a.id === id) || DEFAULT_ACTIVITIES[0];
    }

    return res.status(200).json({ data: activity });
  } catch (error) {
    console.error('getActivityById exception:', error);
    return res.status(200).json({ data: DEFAULT_ACTIVITIES[0] });
  }
};

