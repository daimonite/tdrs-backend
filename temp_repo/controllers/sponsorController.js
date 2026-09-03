/**
 * Sponsor Controller
 * Manages sponsor tier benefits, vector logo assets, and VIP passes
 */
export const getSponsorPortal = async (req, res) => {
  return res.status(200).json({
    sponsor_name: 'CRDB Bank PLC',
    tier: 'Platinum Sponsor',
    contribution_amount_tsh: 25000000,
    deliverables: {
      logo_vector_uploaded: true,
      logo_url: 'https://cdn.tourderotary.co.tz/sponsors/crdb-bank-vector.svg',
      finish_arch_banner_cleared: true,
      cyclist_jersey_sleeve_logo_cleared: true,
      social_media_mentions_count: 14
    },
    vip_passes: {
      allotted: 10,
      claimed: 6,
      remaining: 4,
      pass_codes: ['VIP-CRDB-01', 'VIP-CRDB-02', 'VIP-CRDB-03', 'VIP-CRDB-04']
    }
  });
};

export const uploadSponsorLogo = async (req, res) => {
  const { logo_vector_url } = req.body;
  if (!logo_vector_url) {
    return res.status(400).json({ error: 'Vector logo URL is required' });
  }
  return res.status(200).json({
    success: true,
    message: 'High-res vector logo received and staged for print banners.',
    logo_vector_url
  });
};
