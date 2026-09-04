import { supabase } from '../config/supabase.js';

const OFFICIAL_TWIBBON_FRAMES = [
  {
    id: 'cyclathon_60km',
    title: 'Grand Cyclathon 60km Finisher Frame',
    category: 'Cycling',
    theme_colors: { primary: '#1e3a8a', accent: '#f59e0b', text: '#ffffff' },
    badge_label: '60KM CYCLATHON RIDER',
    preview_url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=800&q=80',
    overlay_aspect_ratio: '1:1',
    svg_badge_path: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z'
  },
  {
    id: 'half_marathon_21km',
    title: 'Coastal Half Marathon 21.1km Frame',
    category: 'Running',
    theme_colors: { primary: '#0284c7', accent: '#f43f5e', text: '#ffffff' },
    badge_label: '21.1KM RUNNER',
    preview_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80',
    overlay_aspect_ratio: '1:1',
    svg_badge_path: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  {
    id: 'charity_walkathon_10km',
    title: 'Community Walkathon 10km Frame',
    category: 'Walking',
    theme_colors: { primary: '#059669', accent: '#fbbf24', text: '#ffffff' },
    badge_label: '10KM CHARITY WALKER',
    preview_url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=800&q=80',
    overlay_aspect_ratio: '1:1',
    svg_badge_path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
  },
  {
    id: 'rotary_ambassador_vip',
    title: 'Rotary Health Ambassador VIP Frame',
    category: 'VIP',
    theme_colors: { primary: '#4c1d95', accent: '#fbbf24', text: '#ffffff' },
    badge_label: 'ROTARY AMBASSADOR 2026',
    preview_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    overlay_aspect_ratio: '1:1',
    svg_badge_path: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
  }
];

export const getTwibbonFrames = (req, res) => {
  return res.status(200).json({
    status: 'success',
    edition: 'Tour de Rotary Dar es Salaam 2026',
    count: OFFICIAL_TWIBBON_FRAMES.length,
    data: OFFICIAL_TWIBBON_FRAMES
  });
};

export const generateTwibbon = async (req, res) => {
  try {
    const { 
      athlete_name = 'Athlete', 
      bib_number = 'CYC-2026-745', 
      activity_title = 'Grand Cyclathon 60km', 
      frame_id = 'cyclathon_60km',
      photo_url
    } = req.body;

    const frame = OFFICIAL_TWIBBON_FRAMES.find(f => f.id === frame_id) || OFFICIAL_TWIBBON_FRAMES[0];

    const shareUrl = `https://tourderotary.co.tz/athlete/${encodeURIComponent(bib_number)}`;
    const shareText = `🚴‍♂️ I'm participating in Tour de Rotary Dar es Salaam 2026 (${frame.badge_label})! Supporting Rotary Maternal & Child Health in Tanzania. Join or sponsor me: ${shareUrl} #TourDeRotaryDSM2026`;

    const socialLinks = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      twitter_x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    // Vector SVG Overlay definition for client-side or canvas rendering
    const svgOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
        <!-- Outer Rotary Ribbon Border -->
        <rect x="20" y="20" width="1040" height="1040" rx="40" fill="none" stroke="${frame.theme_colors.primary}" stroke-width="24"/>
        <rect x="36" y="36" width="1008" height="1008" rx="28" fill="none" stroke="${frame.theme_colors.accent}" stroke-width="6"/>
        
        <!-- Header Ribbon -->
        <path d="M 0,0 L 420,0 L 360,110 L 0,110 Z" fill="${frame.theme_colors.primary}"/>
        <text x="40" y="70" font-family="Plus Jakarta Sans, sans-serif" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="1">TOUR DE ROTARY DSM</text>
        <text x="40" y="96" font-family="Plus Jakarta Sans, sans-serif" font-size="20" font-weight="600" fill="${frame.theme_colors.accent}">DAR ES SALAAM 2026</text>

        <!-- Bottom Banner Overlay -->
        <path d="M 0,860 L 1080,860 L 1080,1080 L 0,1080 Z" fill="${frame.theme_colors.primary}" opacity="0.94"/>
        <rect x="0" y="850" width="1080" height="10" fill="${frame.theme_colors.accent}"/>

        <!-- Athlete Credentials -->
        <text x="60" y="930" font-family="Plus Jakarta Sans, sans-serif" font-size="46" font-weight="800" fill="#ffffff">${athlete_name.toUpperCase()}</text>
        <text x="60" y="976" font-family="Plus Jakarta Sans, sans-serif" font-size="28" font-weight="600" fill="${frame.theme_colors.accent}">${frame.badge_label}</text>
        <text x="60" y="1020" font-family="JetBrains Mono, monospace" font-size="24" font-weight="700" fill="#cbd5e1">OFFICIAL BIB: ${bib_number}</text>

        <!-- Cause Stamp -->
        <text x="1020" y="970" font-family="Plus Jakarta Sans, sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="end">RIDING FOR CHARITY</text>
        <text x="1020" y="1005" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="400" fill="${frame.theme_colors.accent}" text-anchor="end">Maternal & Child Health Initiative</text>
      </svg>
    `.trim();

    // Log social share event
    try {
      await supabase.from('social_shares').insert([{
        participant_name: athlete_name,
        bib_number,
        frame_template: frame_id,
        shared_platform: 'download'
      }]);
    } catch {
      // Non-blocking
    }

    return res.status(200).json({
      status: 'success',
      athlete_name,
      bib_number,
      frame_details: frame,
      composition: {
        photo_url: photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        svg_overlay_data: `data:image/svg+xml;utf8,${encodeURIComponent(svgOverlay)}`,
        aspect_ratio: '1:1',
        resolution: '1080x1080'
      },
      share_links: socialLinks,
      download_filename: `TourDeRotary2026_${bib_number}_Twibbon.png`
    });
  } catch (error) {
    console.error('generateTwibbon exception:', error);
    return res.status(500).json({ error: 'Failed to generate twibbon frame' });
  }
};

export const getOpenGraphCard = (req, res) => {
  const { bib_or_id } = req.params;
  const bib = bib_or_id || 'CYC-2026-745';

  return res.status(200).json({
    status: 'success',
    og_meta: {
      'og:title': `Tour de Rotary DSM 2026 — Official Athlete Pass (BIB: ${bib})`,
      'og:description': `Support this athlete at the Tour de Rotary Dar es Salaam 2026. Benefiting Rotary Club Maternal & Child Health clinics across Tanzania.`,
      'og:image': `https://tourderotary.co.tz/og-cards/${bib}.png`,
      'og:url': `https://tourderotary.co.tz/athlete/${bib}`,
      'og:type': 'profile',
      'twitter:card': 'summary_large_image',
      'twitter:site': '@RotaryDSM',
      'twitter:title': `Athlete Pass | Tour de Rotary 2026 | BIB: ${bib}`
    }
  });
};
