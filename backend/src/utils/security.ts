import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/types.js';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateTokens = (user: User) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.primaryRole
  };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.refreshTokenSecret,
    {
      expiresIn: config.refreshTokenExpiresIn as any
    }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, config.refreshTokenSecret);
  } catch (err) {
    return null;
  }
};
