import { supabase } from '../config/supabase.js';

const ACTIVE_CAMPAIGNS = [
  {
    slug: 'rotary-early-bird-2026',
    title: 'Tour de Rotary 2026 Early Bird Wave',
    source: 'social_media',
    medium: 'instagram',
    discount_percentage: 15,
    clicks_count: 1420,
    conversions_count: 310,
    revenue_generated_tsh: 13950000,
    landing_headline: 'Conquer the Dar Coastline for a Vital Cause',
    banner_image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80',
    is_active: true
  },
  {
    slug: 'corporate-wellness-challenge',
    title: 'Bank & Telecom Corporate 10km Relay',
    source: 'email_outreach',
    medium: 'corporate_hr',
    discount_percentage: 10,
    clicks_count: 480,
    conversions_count: 125,
    revenue_generated_tsh: 4375000,
    landing_headline: 'Corporate Team Health & CSR Impact 2026',
    banner_image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    is_active: true
  },
  {
    slug: 'strava-dar-peloton',
    title: 'Dar es Salaam Strava Club 60km Brevet',
    source: 'strava_partner',
    medium: 'community_club',
    discount_percentage: 5,
    clicks_count: 890,
    conversions_count: 215,
    revenue_generated_tsh: 9675000,
    landing_headline: 'Fastest 60km Coastline Segment Challenge',
    banner_image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    is_active: true
  }
];

export const getCampaignLanding = (req, res) => {
  const { campaign = 'rotary-early-bird-2026' } = req.query;
  const current = ACTIVE_CAMPAIGNS.find(c => c.slug === campaign) || ACTIVE_CAMPAIGNS[0];

  return res.status(200).json({
    status: 'success',
    edition: 'Tour de Rotary Dar es Salaam 2026',
    event_date: '2026-11-01T06:00:00Z',
    flag_off_location: 'Kivukoni Front Waterfront Arch, Dar es Salaam',
    current_phase: 'pre_event',
    campaign: current,
    highlights: [
      '60km Police-Escorted Coastal Cyclathon Roadway',
      '21.1km Half Marathon along Toure Drive & Msasani Peninsula',
      '10km Walkathon with Hydration & First Aid every 2.5km',
      'Digital NFT Finisher Certificates on Polygon Blockchain',
      'All Net Proceeds Benefit Rotary Club Maternal Health Clinics in Tanzania'
    ],
    pricing_tiers: {
      cyclathon_60km: { early_bird_tsh: 45000, standard_tsh: 55000 },
      half_marathon_21km: { early_bird_tsh: 35000, standard_tsh: 45000 },
      walkathon_10km: { early_bird_tsh: 20000, standard_tsh: 25000 },
      yoga_flow: { early_bird_tsh: 15000, standard_tsh: 20000 },
      zumba_fiesta: { early_bird_tsh: 15000, standard_tsh: 20000 }
    }
  });
};

export const getCampaignsList = (req, res) => {
  return res.status(200).json({
    status: 'success',
    count: ACTIVE_CAMPAIGNS.length,
    data: ACTIVE_CAMPAIGNS
  });
};

export const trackCampaignClick = (req, res) => {
  const { slug, utm_source, utm_medium, utm_campaign } = req.body;
  const match = ACTIVE_CAMPAIGNS.find(c => c.slug === slug);
  if (match) {
    match.clicks_count += 1;
  }

  return res.status(200).json({
    status: 'success',
    message: 'Campaign click tracked',
    tracked_params: {
      slug: slug || 'direct',
      utm_source: utm_source || 'organic',
      utm_medium: utm_medium || 'web',
      utm_campaign: utm_campaign || 'rotary-2026'
    }
  });
};
