import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

export const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);

export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
