// `server-only` throws on import outside a React Server Component, which is exactly its job in the
// build. In vitest there is no such distinction, and the guard would stop us unit-testing any
// component whose import graph touches a server module — Topbar reaches `server/feedback/config`
// for one boolean. Aliased to this no-op so the guard stays real in the build and inert in tests.
export {};
