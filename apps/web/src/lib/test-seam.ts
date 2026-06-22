// The single gate for the e2e test seams (the dev-login route + the job-drain route). Read raw
// process.env (NOT the validated getEnv()) so this security boundary holds even if env-schema
// parsing throws. The two-condition AND is the safety property: the NODE_ENV!=="production"
// hard-wall makes both seams unreachable in the deployed app even if E2E_TEST_MODE were ever set
// there by mistake.
export function isTestSeamEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.E2E_TEST_MODE === "true";
}
