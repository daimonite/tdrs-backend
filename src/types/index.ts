export type TabType = 'schedule-a' | 'architecture' | 'api-reference' | 'simulators' | 'integrations' | 'sprint-plan' | 'export';

export type PortalRole = 'participant' | 'volunteer' | 'sponsor' | 'partner' | 'admin';

export type EventPhase = 'pre_event' | 'event_day' | 'post_event';

export type ActivityType = 'Cyclathon' | 'Marathon' | 'Walkathon' | 'Zumba' | 'Yoga' | 'Community Walk';

export interface SqlTableDefinition {
  name: string;
  category: 'Events & Content' | 'Users & Auth' | 'Ticketing & Orders' | 'Inventory & Merch' | 'Training & Collectibles' | 'Communications & Operations';
  description: string;
  columns: {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    nullable?: boolean;
    description: string;
  }[];
  rlsPolicies?: string[];
  sqlCode: string;
}

export interface ApiEndpointDef {
  id: string;
  portal: PortalRole;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  authRequired: boolean;
  allowedRoles: PortalRole[];
  requestBody?: Record<string, any>;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  responseExample: Record<string, any>;
  notes: string;
  category: string;
}

export interface IntegrationGuide {
  id: string;
  name: string;
  provider: string;
  category: 'Payments' | 'SMS' | 'Email' | 'Fitness' | 'Collectibles' | 'Security';
  status: 'Ready for Implementation' | 'Configured' | 'Testing';
  summary: string;
  authMethod: string;
  keyEndpointsOrEvents: string[];
  codeSample: {
    filename: string;
    language: string;
    code: string;
  };
  bestPractices: string[];
  failureHandling: string;
}

export interface SprintPhase {
  id: string;
  dates: string;
  title: string;
  focus: string;
  status: 'Completed' | 'In Progress' | 'Upcoming';
  deliverables: {
    title: string;
    details: string;
    done: boolean;
    module: string;
  }[];
  keyChecklist: string[];
}

