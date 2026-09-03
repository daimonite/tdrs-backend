export interface SecurityCheckItem {
  id: string;
  category: 'Concurrency & Race Conditions' | 'Authentication & JWT' | 'Database & Injection' | 'Redis & Networking' | 'Compliance & Auditing';
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  riskDescription: string;
  mitigationStrategy: string;
  codePattern: string;
}

export const SECURITY_CHECKLIST: SecurityCheckItem[] = [
  {
    id: 'sec-1',
    category: 'Concurrency & Race Conditions',
    title: 'Row Locking (SELECT FOR UPDATE) on Transfer Processing',
    severity: 'Critical',
    riskDescription: 'If two sub-agents or automated bots submit the same transfer request simultaneously, both requests might pass status validation and deduct money twice (Double-Spend Vulnerability).',
    mitigationStrategy: 'Wrap all transfer balance checks and status mutations in a PostgreSQL transaction (db.tx) and lock the request row with SELECT * FROM requests WHERE id = $1 FOR UPDATE.',
    codePattern: `await db.tx(async (t) => {
  const request = await t.oneOrNone('SELECT * FROM requests WHERE id = $1 FOR UPDATE', [id]);
  if (request.status === 'completed') throw new Error('Already completed');
  // Process transfer & update
});`
  },
  {
    id: 'sec-2',
    category: 'Authentication & JWT',
    title: 'Strict Role-Based Middleware Enforcement (RBAC)',
    severity: 'Critical',
    riskDescription: 'If role verification only checks if a token exists without verifying decoded.role === "admin", malicious sub-agents can call admin endpoints like DELETE /api/agents/:id or GET /api/dashboard/*.',
    mitigationStrategy: 'Use the auth(true) middleware on all administrative routes, strictly validating the signature with JWT_SECRET and verifying req.user.role === "admin".',
    codePattern: `// In routes/agentRoutes.js
router.delete('/:id', auth(true), agentController.deleteAgent); // auth(true) enforces role: 'admin'`
  },
  {
    id: 'sec-3',
    category: 'Redis & Networking',
    title: 'TLS Enforcement for Redis Cloud / Upstash in Production',
    severity: 'High',
    riskDescription: 'Connecting to cloud Redis clusters over unencrypted plain-text TCP leaves float request data, phone numbers, and queue scores exposed to packet sniffing.',
    mitigationStrategy: 'Configure ioredis with tls: { rejectUnauthorized: false } (or custom CA certificates) when running in production or connecting to cloud Redis providers.',
    codePattern: `const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});`
  },
  {
    id: 'sec-4',
    category: 'Database & Injection',
    title: 'Strict Parameterized SQL Queries (No String Concatenation)',
    severity: 'Critical',
    riskDescription: 'Concatenating raw inputs into SQL query strings allows attackers to execute arbitrary SQL commands (e.g. \'; DROP TABLE agents; --).',
    mitigationStrategy: 'Always use parameterized placeholders ($1, $2) with pg-promise or prepared statements.',
    codePattern: `// ❌ DANGEROUS: db.query('SELECT * FROM agents WHERE email = "' + email + '"')
// ✅ SECURE:
const agent = await db.oneOrNone('SELECT * FROM agents WHERE email = $1', [email]);`
  },
  {
    id: 'sec-5',
    category: 'Concurrency & Race Conditions',
    title: 'Idempotency Keys for Telecom Gateway Retries',
    severity: 'High',
    riskDescription: 'When telecom gateways (M-Pesa, Tigo Pesa, Yas) experience timeout spikes, automated retries can cause duplicate wallet debits.',
    mitigationStrategy: 'Pass a unique Idempotency-Key (or requestId) to external telecom gateways and store transaction states in Redis/PostgreSQL before invoking external APIs.',
    codePattern: `const telecomRes = await axios.post(MPESA_API_URL, payload, {
  headers: { 'X-Idempotency-Key': requestId, 'Authorization': \`Bearer \${MPESA_KEY}\` }
});`
  },
  {
    id: 'sec-6',
    category: 'Authentication & JWT',
    title: 'Password Hashing with Cryptographic Salt (Bcrypt 10+ Rounds)',
    severity: 'Critical',
    riskDescription: 'Storing plain text or weakly hashed passwords (MD5, SHA1) allows immediate credential compromise in the event of a database leak.',
    mitigationStrategy: 'Use bcrypt with at least 10 salt rounds (approx. 100ms calculation time per hash) to defend against dictionary attacks and rainbow tables.',
    codePattern: `const hash = await bcrypt.hash(rawPassword, 10);
const isMatch = await bcrypt.compare(providedPassword, storedHash);`
  },
  {
    id: 'sec-7',
    category: 'Compliance & Auditing',
    title: 'Redacting Sensitive Data from Logs and API Responses',
    severity: 'High',
    riskDescription: 'Logging authorization tokens, raw passwords, or telecom PINs to console or log aggregators breaches financial compliance regulations (PCI-DSS, GDPR).',
    mitigationStrategy: 'Always delete password_hash before returning agent objects, and use a logging serializer that masks sensitive fields.',
    codePattern: `// In authController:
const agentData = { ...newAgent };
delete agentData.password_hash;
res.status(200).json({ agent: agentData });`
  }
];
