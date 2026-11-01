/**
 * zod 4 has a single `error` option per schema (it replaced zod 3's
 * required_error / invalid_type_error). This keeps the two cases apart:
 * a missing field gets `missing`, a value of the wrong type gets `invalid`.
 */
export function missingOr(missing: string, invalid: string) {
  return (issue: { input?: unknown }) => (issue.input === undefined ? missing : invalid);
}
