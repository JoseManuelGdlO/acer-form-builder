import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload } from '../types';

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as string | number,
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};
