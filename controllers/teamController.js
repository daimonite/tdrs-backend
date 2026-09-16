import supabase from '../config/supabase.js';

// Schema: migration 017 `teams` / `team_members`.
// - teams: name, slug (UNIQUE NOT NULL — derived from the name here),
//   team_type (corporate|university|hospital|club|friends|ngo|community),
//   story, logo_url, captain_id, is_relay + relay_{swimmer,cyclist,runner}_id,
//   member_count (denormalized, kept in sync below).
// - team_members: role (captain|member|swimmer|cyclist|runner),
//   UNIQUE (team_id, user_id).
const TEAM_TYPES = ['corporate', 'university', 'hospital', 'club', 'friends', 'ngo', 'community'];
const RELAY_ROLES = ['swimmer', 'cyclist', 'runner'];
// Relay teams field exactly three legs; open teams get a generous ceiling.
const capacityOf = (team) => (team?.is_relay ? RELAY_ROLES.length : 100);

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'team';
}

async function uniqueSlug(name) {
  const base = slugify(name);
  const { data } = await supabase.from('teams').select('slug').eq('slug', base).maybeSingle();
  return data ? `${base}-${Date.now().toString(36)}` : base;
}

export const getTeams = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('teams')
      .select('*, captain:captain_id (full_name)', { count: 'exact' })
      .order('member_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (type) {
      if (!TEAM_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid team type. Use: ' + TEAM_TYPES.join(', ') });
      query = query.eq('team_type', type);
    }
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil((count || 0) / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to retrieve teams' });
  }
};

export const getTeamDetail = async (req, res) => {
  try {
    const { teamId } = req.params;
    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*, captain:captain_id (full_name)').eq('id', teamId).maybeSingle(),
      supabase.from('team_members').select('*, profiles:user_id (full_name)').eq('team_id', teamId).order('joined_at', { ascending: true })
    ]);
    if (teamRes.error) throw teamRes.error;
    if (!teamRes.data) return res.status(404).json({ error: 'Team not found' });
    if (membersRes.error) throw membersRes.error;
    res.json({ success: true, data: { ...teamRes.data, members: membersRes.data || [] } });
  } catch (err) {
    console.error('Error fetching team detail:', err);
    res.status(500).json({ error: 'Failed to retrieve team detail' });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, story, team_type = 'community', is_relay = false, logo_url } = req.body;
    const captain_id = req.user?.id;
    if (!captain_id) return res.status(401).json({ error: 'Authentication required' });
    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Team name is required' });
    if (!TEAM_TYPES.includes(team_type)) return res.status(400).json({ error: 'Invalid team_type. Use: ' + TEAM_TYPES.join(', ') });

    const slug = await uniqueSlug(name);
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: name.trim(), slug, story: story?.trim() || null, team_type, is_relay: Boolean(is_relay), logo_url: logo_url || null, captain_id })
      .select().single();
    if (teamError) throw teamError;

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: captain_id, role: 'captain' });
    if (memberError) {
      // Don't leave a captain-less team behind.
      await supabase.from('teams').delete().eq('id', team.id);
      throw memberError;
    }
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const joinTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { role = 'member' } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });

    const { data: team } = await supabase.from('teams').select('id, name, is_relay, member_count').eq('id', teamId).maybeSingle();
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.is_relay) {
      if (!RELAY_ROLES.includes(role)) return res.status(400).json({ error: 'Relay teams join as swimmer, cyclist or runner' });
    } else if (role !== 'member') {
      return res.status(400).json({ error: 'Only relay teams take discipline roles' });
    }

    if ((team.member_count || 0) >= capacityOf(team)) return res.status(409).json({ error: 'Team is at full capacity' });

    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id, role });
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You are already a member of this team' });
      throw error;
    }

    // Keep the denormalized counter honest.
    const { count } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
    await supabase.from('teams').update({ member_count: count || 0 }).eq('id', teamId);

    res.json({ success: true, message: 'Successfully joined ' + team.name });
  } catch (err) {
    console.error('Error joining team:', err);
    res.status(500).json({ error: 'Failed to join team' });
  }
};

export const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Authentication required' });

    const { data: removed, error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId).eq('user_id', user_id).neq('role', 'captain')
      .select('id');
    if (error) throw error;
    if (!removed || removed.length === 0) {
      return res.status(404).json({ error: 'You are not a member of this team (captains cannot leave their own team)' });
    }

    const { count } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
    await supabase.from('teams').update({ member_count: count || 0 }).eq('id', teamId);

    res.json({ success: true, message: 'Left team successfully' });
  } catch (err) {
    console.error('Error leaving team:', err);
    res.status(500).json({ error: 'Failed to leave team' });
  }
};
