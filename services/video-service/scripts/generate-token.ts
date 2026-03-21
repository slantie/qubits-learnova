import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.SERVICE_AUTH_SECRET;
if (!secret) {
  console.error('SERVICE_AUTH_SECRET is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const token = jwt.sign({ service: 'learnova-server', iat: now, exp: now + 3600 }, secret);

console.log('\n--- Service Token (valid for 1 hour) ---\n');
console.log(token);
console.log('\n--- Usage with curl ---\n');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:4001/api/videos\n`);
