import 'dotenv/config';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt_' + password.length);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx src/scripts/create-admin-cli.ts <username> <password>');
    process.exit(1);
  }
  
  const username = args[0];
  const password = args[1];
  
  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing[0]) {
    console.error('Username already exists');
    process.exit(1);
  }

  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const userId = uuid();

  await db.insert(users).values({
    id: userId,
    username,
    passwordHash,
    role: 'admin',
    createdAt: new Date(),
  });

  console.log(`Admin user "${username}" created successfully!`);
}

main().catch(console.error);