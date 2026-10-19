/**
 * Welche Onboarding-Schritte es gibt – abhängig von den gewählten Modulen (rein, getestet).
 */

/** @typedef {'hello'|'modules'|'mama'|'goal'|'days'|'gear'|'companion'} StepId */

/**
 * @param {string[]} modules   eingeschaltete Module (normalisiert)
 * @returns {StepId[]}
 */
export function onboardingSteps(modules) {
  /** @type {StepId[]} */
  const steps = ['hello', 'modules'];
  if (modules.includes('mama')) steps.push('mama');
  if (modules.includes('train')) steps.push('goal', 'days', 'gear');
  steps.push('companion');
  return steps;
}

/**
 * Nächster/vorheriger Schritt; bleibt in den Grenzen.
 * @param {StepId[]} steps
 * @param {StepId} current
 * @param {1|-1} direction
 * @returns {StepId|null}  null = über das Ende hinaus (fertig)
 */
export function neighbourStep(steps, current, direction) {
  const i = steps.indexOf(current);
  const next = (i < 0 ? 0 : i) + direction;
  if (next < 0) return steps[0];
  return next >= steps.length ? null : steps[next];
}
