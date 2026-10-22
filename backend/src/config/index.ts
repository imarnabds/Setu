import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'ipo-connect-super-secret-jwt-key-2025-secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'ipo-connect-refresh-secret-jwt-key-2025-secure',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ipo_connect',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  appName: 'Setu',
  commissionMin: 0,
  commissionMax: 50,
  commissionStep: 2.5,
  validCommissionRates: [
    0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0, 22.5, 25.0,
    27.5, 30.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 47.5, 50.0
  ]
};
