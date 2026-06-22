export function buildInviteUrl(origin, inviteCode) {
  return `${origin}/invite?code=${inviteCode.trim().toUpperCase()}`;
}

export function buildWhatsAppInviteUrl(origin, inviteCode) {
  const inviteUrl = buildInviteUrl(origin, inviteCode);
  const text = encodeURIComponent(`הצטרפו לספריית המתכונים שלי ב-Re-smash:\n${inviteUrl}`);

  return `https://wa.me/?text=${text}`;
}
