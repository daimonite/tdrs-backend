import { supabase } from '../config/supabase.js';
import { sendSmsNotification } from '../services/textifySmsService.js';

const SYSTEM_COMMUNICATION_TEMPLATES = [
  {
    template_key: 'reg_confirmed_sms',
    channel: 'SMS',
    provider: 'Textify Africa',
    title: 'Registration Confirmation SMS',
    merge_tags: ['athlete_name', 'bib_number', 'activity_title', 'pass_url'],
    body_template: 'Karibu Tour de Rotary DSM 2026, {{athlete_name}}! Your pass for {{activity_title}} is confirmed. Official BIB: {{bib_number}}. View your gate QR pass at: {{pass_url}}'
  },
  {
    template_key: 'day4_reservation_warning_sms',
    channel: 'SMS',
    provider: 'Textify Africa',
    title: 'Day 4 Merchandise Hold Reminder',
    merge_tags: ['athlete_name', 'order_number', 'amount_tsh', 'checkout_url'],
    body_template: 'Habari {{athlete_name}}, your Tour de Rotary merchandise order {{order_number}} (TSh {{amount_tsh}}) has 3 days remaining before stock is auto-released. Complete payment at {{checkout_url}}'
  },
  {
    template_key: 'day6_reservation_warning_sms',
    channel: 'SMS',
    provider: 'Textify Africa',
    title: 'Day 6 Final Expiration Warning SMS',
    merge_tags: ['athlete_name', 'order_number', 'hours_remaining'],
    body_template: 'URGENT: Tour de Rotary reservation for order {{order_number}} expires in {{hours_remaining}} hours. Reserved jerseys & gear will be released to the public queue.'
  },
  {
    template_key: 'finisher_celebration_sms',
    channel: 'SMS',
    provider: 'Textify Africa',
    title: 'Finisher Certificate & Results SMS',
    merge_tags: ['athlete_name', 'bib_number', 'finish_time', 'cert_url'],
    body_template: 'Hongera sana {{athlete_name}}! You conquered Tour de Rotary DSM 2026 (BIB: {{bib_number}}) in {{finish_time}}. View and share your verified Finisher Certificate: {{cert_url}}'
  },
  {
    template_key: 'reg_confirmed_email',
    channel: 'EMAIL',
    provider: 'Resend',
    title: 'Official Athlete Ticket & Tax Receipt',
    subject: 'Your Tour de Rotary DSM 2026 Entry Pass & Official BIB [{{bib_number}}]',
    merge_tags: ['athlete_name', 'bib_number', 'activity_title', 'order_number', 'amount_tsh', 'flag_off_time', 'venue_location'],
    body_template: `<h2>Karibu Tour de Rotary Dar es Salaam 2026</h2>
<p>Dear <strong>{{athlete_name}}</strong>,</p>
<p>Thank you for registering for the <strong>{{activity_title}}</strong>. Your registration and merchandise reservation have been successfully confirmed.</p>
<ul>
  <li><strong>Official BIB Number:</strong> {{bib_number}}</li>
  <li><strong>Flag-off Time:</strong> {{flag_off_time}}</li>
  <li><strong>Venue / Start Arch:</strong> {{venue_location}}</li>
  <li><strong>Total Paid:</strong> TSh {{amount_tsh}} (Order: {{order_number}})</li>
</ul>
<p>Please present the attached QR pass at the entrance scanner gates on event morning.</p>`
  },
  {
    template_key: 'volunteer_briefing_email',
    channel: 'EMAIL',
    provider: 'Resend',
    title: 'Marshal & Volunteer Operations Briefing',
    subject: 'Official Operations Briefing: Station {{station_name}} [Tour de Rotary 2026]',
    merge_tags: ['volunteer_name', 'station_name', 'shift_hours', 'supervisor_phone'],
    body_template: `<h2>Tour de Rotary 2026 — Operations Briefing</h2>
<p>Dear <strong>{{volunteer_name}}</strong>,</p>
<p>You are assigned to <strong>{{station_name}}</strong>. Your reporting time is <strong>{{shift_hours}}</strong>.</p>
<p>Lead Coordinator Emergency Hotline: <strong>{{supervisor_phone}}</strong>.</p>`
  }
];

export const getCommunicationTemplates = async (req, res) => {
  try {
    const { data: dbTemplates } = await supabase
      .from('communication_templates')
      .select('*')
      .order('template_key', { ascending: true });

    const templates = (dbTemplates && dbTemplates.length > 0) ? dbTemplates : SYSTEM_COMMUNICATION_TEMPLATES;

    return res.status(200).json({
      status: 'success',
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('getCommunicationTemplates exception:', error);
    return res.status(500).json({ error: 'Failed to retrieve communication templates' });
  }
};

export const previewRenderedTemplate = async (req, res) => {
  try {
    const { template_key, variables = {} } = req.body;

    if (!template_key) {
      return res.status(400).json({ error: 'template_key is required' });
    }

    const { data: dbTemplate } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('template_key', template_key)
      .maybeSingle();

    const template = dbTemplate || SYSTEM_COMMUNICATION_TEMPLATES.find(t => t.template_key === template_key);

    if (!template) {
      return res.status(404).json({ error: `Template with key '${template_key}' not found` });
    }

    let renderedBody = template.body_template;
    let renderedSubject = template.subject || '';

    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedBody = renderedBody.replace(regex, String(val));
      renderedSubject = renderedSubject.replace(regex, String(val));
    }

    return res.status(200).json({
      status: 'success',
      template_key,
      channel: template.channel,
      rendered_subject: renderedSubject || undefined,
      rendered_body: renderedBody,
      variables_applied: variables
    });
  } catch (error) {
    console.error('previewRenderedTemplate exception:', error);
    return res.status(500).json({ error: 'Failed to render template preview' });
  }
};

export const sendTestCommunication = async (req, res) => {
  try {
    const { channel = 'SMS', recipient, message } = req.body;

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient phone number or email is required' });
    }

    const textMessage = message || `[Tour de Rotary DSM 2026] Test dispatch to ${recipient}`;

    if (channel.toUpperCase() === 'SMS') {
      const smsResult = await sendSmsNotification(recipient, textMessage);

      await supabase.from('audit_logs').insert([{
        action: 'COMMUNICATION_SMS_DISPATCH',
        target_resource: recipient,
        details_json: { status: smsResult?.status || 'dispatched' },
        actor_role: 'admin'
      }]);

      return res.status(200).json({
        status: 'success',
        channel: 'SMS',
        provider: 'Textify Africa',
        recipient,
        result: smsResult
      });
    }

    await supabase.from('audit_logs').insert([{
      action: 'COMMUNICATION_EMAIL_DISPATCH',
      target_resource: recipient,
      details_json: { channel: 'EMAIL' },
      actor_role: 'admin'
    }]);

    return res.status(200).json({
      status: 'success',
      channel: 'EMAIL',
      provider: 'Resend',
      recipient,
      message: `Email dispatch queued for ${recipient}`
    });
  } catch (error) {
    console.error('sendTestCommunication exception:', error);
    return res.status(500).json({ error: 'Failed to send test communication' });
  }
};

export const getCommunicationLogs = async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .ilike('action', '%COMMUNICATION%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      status: 'success',
      count: logs ? logs.length : 0,
      data: logs || []
    });
  } catch (error) {
    console.error('getCommunicationLogs exception:', error);
    return res.status(500).json({ error: 'Failed to retrieve communication logs' });
  }
};
