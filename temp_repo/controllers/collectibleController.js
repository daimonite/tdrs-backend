import { supabase } from '../config/supabase.js';

/**
 * Digital Collectible Controller - Tamper-proof certificate verification
 * Validates finisher certificates via unique verification hash on Polygon / Supabase
 */
export const getMyCollectible = async (req, res) => {
  try {
    const userEmail = req.query.email || req.headers['x-user-email'];

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (!profile) {
      return res.status(200).json({
        status: 'success',
        message: 'No profile found for athlete.',
        data: null
      });
    }

    const { data: collectibles, error } = await supabase
      .from('digital_collectibles')
      .select(`
        id,
        serial_number,
        tier,
        finish_time,
        public_verification_hash,
        certificate_pdf_url,
        on_chain_network,
        on_chain_tx_hash,
        issued_at,
        profiles (full_name),
        activities (title, category, distance_km)
      `)
      .eq('profile_id', profile.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!collectibles || collectibles.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No finisher certificates issued yet for this athlete.',
        data: null
      });
    }

    return res.status(200).json({
      status: 'success',
      data: collectibles[0]
    });
  } catch (error) {
    console.error('getMyCollectible exception:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyCertificateByHash = async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({ error: 'Verification hash is required' });
    }

    const { data: collectible, error } = await supabase
      .from('digital_collectibles')
      .select(`
        id,
        serial_number,
        tier,
        finish_time,
        public_verification_hash,
        certificate_pdf_url,
        on_chain_network,
        on_chain_tx_hash,
        issued_at,
        profiles (full_name),
        activities (title, distance_km)
      `)
      .eq('public_verification_hash', hash)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!collectible) {
      return res.status(404).json({
        verified: false,
        status: 'invalid',
        message: 'Certificate hash not found in official event registry',
        public_verification_hash: hash
      });
    }

    return res.status(200).json({
      verified: true,
      status: 'verified',
      message: 'Official Tour de Rotary DSM 2026 Verified Finisher Certificate',
      certificate: {
        id: collectible.id,
        serial_number: collectible.serial_number,
        tier: collectible.tier,
        finish_time: collectible.finish_time,
        public_verification_hash: collectible.public_verification_hash,
        certificate_pdf_url: collectible.certificate_pdf_url,
        on_chain_network: collectible.on_chain_network,
        on_chain_tx_hash: collectible.on_chain_tx_hash,
        athlete_name: collectible.profiles?.full_name,
        activity_title: collectible.activities?.title,
        issued_at: collectible.issued_at
      }
    });
  } catch (error) {
    console.error('verifyCertificateByHash exception:', error);
    return res.status(500).json({ error: 'Internal server error during verification' });
  }
};
