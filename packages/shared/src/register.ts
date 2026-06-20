export type Register = "host" | "95-forward";

export const F95_ROUTE_PREFIX = "/95-forward";

function stripQueryAndHash(pathname: string): string {
  const noHash = pathname.split("#")[0] ?? "";
  return noHash.split("?")[0] ?? "";
}

export function resolveRegister(pathname: string): Register {
  const path = stripQueryAndHash(pathname);
  if (path === F95_ROUTE_PREFIX || path.startsWith(`${F95_ROUTE_PREFIX}/`)) {
    return "95-forward";
  }
  return "host";
}

export function isForwardRoute(pathname: string): boolean {
  return resolveRegister(pathname) === "95-forward";
}
