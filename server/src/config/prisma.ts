import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

//Create a standard postgresql connection pool
const pool = new Pool({ connectionString });

// wrapping the pool in prisma's adapter
const adapter = new PrismaPg(pool);

// Initialize the client with the adapter
export const prisma = new PrismaClient({ adapter });