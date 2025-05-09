import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'wapprove-secret-key',
  accessTokenExpires: process.env.JWT_ACCESS_EXPIRATION || '7d',
  refreshTokenExpires: process.env.JWT_REFRESH_EXPIRATION || '14d',
}));
