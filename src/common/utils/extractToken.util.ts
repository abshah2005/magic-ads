export function extractToken(authHeader?: string): string {
  if (!authHeader) throw new Error('Authorization header is missing');

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('Invalid Authorization header format');
  }

  const token = parts[1];
  if (!token) throw new Error('Authorization token is missing');

  return token;
  
}