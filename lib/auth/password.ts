import bcrypt from "bcryptjs";

const COST_FACTOR = 12;
const MIN_LENGTH = 10;
const HISTORY_LIMIT = 5;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

// Constant-time comparison — prevents timing attacks
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordStrength(
  password: string,
  userEmail: string,
  userName: string
): { valid: boolean; error?: string } {
  if (password.length < MIN_LENGTH)
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters.` };

  if (!/[A-Z]/.test(password))
    return { valid: false, error: "Password must include at least one uppercase letter." };

  if (!/[0-9]/.test(password))
    return { valid: false, error: "Password must include at least one number." };

  if (!/[!@#$%^&*]/.test(password))
    return { valid: false, error: "Password must include at least one special character (!@#$%^&*)." };

  const lowerPass = password.toLowerCase();
  if (lowerPass.includes(userEmail.toLowerCase().split("@")[0]))
    return { valid: false, error: "Password cannot contain your email address." };

  if (lowerPass.includes(userName.toLowerCase()))
    return { valid: false, error: "Password cannot contain your name." };

  return { valid: true };
}

export async function isPasswordInHistory(
  plain: string,
  history: { passwordHash: string }[]
): Promise<boolean> {
  const recent = history.slice(0, HISTORY_LIMIT);
  for (const entry of recent) {
    if (await bcrypt.compare(plain, entry.passwordHash)) return true;
  }
  return false;
}
