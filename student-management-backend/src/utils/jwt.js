const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  if (process.env.NODE_ENV === 'production' && /(replace|change|example|your|studentos|generate)/i.test(secret)) {
    throw new Error('JWT_SECRET must be a unique random production secret');
  }
  return secret;
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: Number(user.token_version || 0)
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'studentos-api',
      audience: 'studentos-web'
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'studentos-api',
    audience: 'studentos-web'
  });
};

module.exports = {
  generateToken,
  verifyToken
};
