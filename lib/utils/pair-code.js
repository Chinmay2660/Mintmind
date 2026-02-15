/**
 * Generate a unique 6-digit pair code
 */
export function generatePairCode() {
  // Generate a 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Validate pair code format
 */
export function isValidPairCodeFormat(code) {
  return /^\d{6}$/.test(code);
}

