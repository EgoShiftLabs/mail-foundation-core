const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True only for canonical UUID strings.
 *
 * Message / report / thread identifiers map to Postgres `uuid` columns.
 * Passing a non-UUID string straight into a `uuid`-typed query makes
 * Postgres raise "invalid input syntax for type uuid", which surfaces as a
 * 500 and leaks a database error. Validate first and fail as a clean 404.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
