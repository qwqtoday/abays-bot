import 'dotenv/config';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import * as readline from 'readline';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt_' + password.length);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('=== Create Admin User ===\n');

  const username = await question('Username: ');
  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing[0]) {
    console.error('Username already exists');
    process.exit(1);
  }

  const password = await question('Password: ');
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

  console.log(`\nAdmin user "${username}" created successfully!`);
  rl.close();
}

main().catch(console.error);