const { ValidationError } = require('./checkout-validation');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object');
  }
  const { name, email } = body;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('name must be a non-empty string');
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    throw new ValidationError('email must be a valid email address');
  }
}

module.exports = { validateProfileUpdate };
