// Normalizes an identifier (email or username) for uniqueness comparisons
// and storage, per spec.md FR-003/FR-011: lowercase + trim surrounding whitespace.
export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}
