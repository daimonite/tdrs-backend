import supabase from '../config/supabaseClient.js';

export const getTeams = async (req, res) => {
  try {
    const { page = 1, limit = 20, discipline } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('teams')
      .select('*, captain:captain_id (full_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (discipline) query = query.eq('discipline', discipline);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to retrieve teams' });
  }
};

export const getTeamDetail = async (req, res) => {
  try {
    const { teamId } = req.params;
    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*, captain:captain_id (full_name, avatar_url)').eq('id', teamId).maybeSingle(),
      supabase.from('team_members').select('*, profiles:user_id (full_name, avatar_url)').eq('team_id', teamId).order('joined_at', { ascending: true })
    ]);
    if (!teamRes.data) return res.status(404).json({ error: 'Team not found' });
    res.json({ success: true, data: { ...teamRes.data, members: membersRes.data || [] } });
  } catch (err) {
    console.error('Error fetching team detail:', err);
    res.status(500).json({ error: 'Failed to retrieve team detail' });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, description, discipline = 'triathlon', is_relay = false, max_members = 6 } = req.body;
    const captain_id = req.user?.id;
    if (!captain_id) return res.status(401).json({ error: 'Authentication required' });
    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Team name is required' });
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: name.trim(), description: description?.trim(), discipline, is_relay, max_members, captain_id })
      .select().single();
    if (teamError) {
      if (teamError.code === '23505') return res.status(409).json({ error: 'A team with this name already exists' });
      throw teamError;
    }
    await supabase.from('team_members').insert({ team_id: team.id, user_id: captain_id, role: 'captain' });
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
    const { data: team } = await supabase.from('teams').select('max_members, name').eq('id', teamId).maybeSingle();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const { count } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
    if (count >= team.max_members) return res.status(409).json({ error: 'Team is at full capacity' });
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id, role });
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You are already a member of this team' });
      throw error;
    }
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
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', user_id).neq('role', 'captain');
    if (error) throw error;
    res.json({ success: true, message: 'Left team successfully' });
  } catch (err) {
    console.error('Error leaving team:', err);
    res.status(500).json({ error: 'Failed to leave team' });
  }
};
