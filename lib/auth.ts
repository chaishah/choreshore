const USERNAME_DOMAIN = "chorequest.local";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function usernameToEmail(username: string) {
  const value = username.trim().toLowerCase();
  return value.includes("@") ? value : `${normalizeUsername(value)}@${USERNAME_DOMAIN}`;
}
