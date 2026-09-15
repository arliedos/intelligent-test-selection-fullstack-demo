// Checked arithmetic for money math (line subtotal, cart subtotal, total).
// Rejects any operand or result outside Number.isSafeInteger's range
// instead of silently producing an imprecise or wrapped value.
class UnsafeArithmeticError extends Error {}

function assertSafeInteger(value) {
  if (!Number.isSafeInteger(value)) {
    throw new UnsafeArithmeticError('operand or result is not a safe integer');
  }
}

function safeMultiply(a, b) {
  assertSafeInteger(a);
  assertSafeInteger(b);
  const result = a * b;
  assertSafeInteger(result);
  return result;
}

function safeAdd(a, b) {
  assertSafeInteger(a);
  assertSafeInteger(b);
  const result = a + b;
  assertSafeInteger(result);
  return result;
}

module.exports = { safeAdd, safeMultiply, assertSafeInteger, UnsafeArithmeticError };
