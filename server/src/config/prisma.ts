import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to the environment (.env locally, platform env vars in production).');
}

// The pg driver adapter can only talk to a real postgres server. If you point
// DATABASE_URL at a `prisma+postgres://` Accelerate URL instead of the direct
// `postgresql://` connection string (Prisma Postgres -> Console -> direct URL),
// this will fail loudly instead of timing out on connection.
if (connectionString.startsWith('prisma+postgres')) {
    throw new Error(
        'DATABASE_URL is a prisma+postgres:// (Accelerate) URL, which the pg driver adapter cannot use. ' +
        'Use the direct postgresql:// connection string (sslmode=require) instead.'
    );
}

// remote providers (Prisma Postgres, Neon, ...) terminate TLS; local dev does not
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);

//Create a standard postgresql connection pool
const pool = new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

// wrapping the pool in prisma's adapter
const adapter = new PrismaPg(pool);

// Initialize the client with the adapter
export const prisma = new PrismaClient({ adapter });
