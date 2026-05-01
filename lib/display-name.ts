// First name + last initial — what we show on public surfaces (review
// comments, chat headers shown to the other party). Falls back to a
// hard-coded "Sheen customer" if the user has no name on file so we
// never accidentally leak an email or UUID.
export function publicCustomerName(opts: {
  display_name?: string | null;
  full_name?: string | null;
}): string {
  const name = (opts.display_name || opts.full_name || "").trim();
  if (!name) return "Sheen customer";
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
}
