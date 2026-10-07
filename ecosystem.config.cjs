/**
 * PM2 process config for production (cPanel Node.js app or VPS).
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save            # persist across reboots
 *   pm2 logs tdr-backend
 *
 * Deliberate choice — instances: 1, NOT cluster mode:
 * The HTTP layer is stateless (JWT bearer/cookie auth, Supabase is the only
 * state store) so it scales horizontally behind a load balancer or Nginx
 * upstream without sticky sessions. But the in-process background workers
 * (communication dispatch every 60s, inventory reservation, phase engine)
 * use select-then-update with no FOR UPDATE SKIP LOCKED claiming, so two
 * concurrent processes would double-send SMS/email. Scale out by running
 * more single-instance processes on separate machines BEHIND A LOAD BALANCER
 * only if each machine's queue duties are disabled, or after adding an
 * atomic claim RPC to the dispatchers (recommended next step — see
 * docs/DEPLOYMENT.md, "Scaling & load balancing").
 */
module.exports = {
  apps: [
    {
      name: 'tdr-backend',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      // Matches the 10s graceful-shutdown window in index.js — PM2 waits
      // this long for in-flight requests to drain before SIGKILL.
      kill_timeout: 12000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8800
      }
    }
  ]
};
