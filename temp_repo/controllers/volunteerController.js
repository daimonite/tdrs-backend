/**
 * Volunteer Controller
 * Handles shifts, briefing materials, and gate scanner access
 */
export const getMyVolunteerShift = async (req, res) => {
  return res.status(200).json({
    role: 'volunteer',
    volunteer_name: 'David Mollel',
    assigned_station: 'Water Point 3 (Kawe Roundabout)',
    role_title: 'Hydration Marshall & First Aid Assistant',
    shift_hours: '05:30 AM - 11:30 AM (1 Nov 2026)',
    team_lead: 'Capt. Grace Mwangi (+255754998877)',
    briefing_status: 'Completed',
    briefing_pdf_url: 'https://cdn.tourderotary.co.tz/docs/volunteer-briefing-2026.pdf',
    gate_scanner_access_granted: true
  });
};

export const acknowledgeBriefing = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Safety and hydration briefing acknowledged.'
  });
};
