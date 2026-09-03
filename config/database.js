import pgp from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const connectionString = process.env.DATABASE_URL;

// Initialize pg-promise
const initOptions = {
  error: (error, e) => {
    console.warn('⚠️ Database query warning:', error.message || error);
  }
};
const pgPromise = pgp(initOptions);

let db;

if (connectionString && connectionString.startsWith('postgres')) {
  // Create database connection
  db = pgPromise({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20
  });

  db.connect()
    .then(obj => {
      console.log('✅ PostgreSQL connected to Supabase (pg-promise)');
      obj.done();
    })
    .catch(error => {
      console.warn('⚠️ Direct PostgreSQL connection inactive (using Supabase REST client):', error.message || error);
    });
} else {
  console.log('ℹ️ DATABASE_URL not provided; defaulting to Supabase JS Client & resilient in-memory fallbacks.');
  // Safe proxy to prevent crashes when DATABASE_URL is not configured yet
  const dummyHandler = {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return async (...args) => {
          // Return empty results for typical pg-promise calls
          if (prop === 'one') return { total: 0 };
          if (prop === 'oneOrNone') return null;
          if (prop === 'manyOrNone' || prop === 'any') return [];
          if (prop === 'none') return null;
          return [];
        };
      }
      return target[prop];
    }
  };
  db = new Proxy({}, dummyHandler);
}

export default db;
