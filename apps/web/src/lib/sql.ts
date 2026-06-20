// Escape LIKE/ILIKE metacharacters (% _ \) so user search text is matched
// literally rather than as wildcards.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
