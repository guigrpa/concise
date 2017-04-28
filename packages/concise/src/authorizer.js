// @flow

/* eslint-disable no-prototype-builtins, no-eval */

import type {
  AuthRule,
  AuthRequest,
  AuthResponse,
  AuthCheck,
} from 'concise-types';

// ====================================
// Main
// ====================================
class Authorizer {
  rules: Array<AuthRule>;

  constructor(rules: Array<AuthRule>) {
    this.rules = rules;
  }

  async can(req: AuthRequest): Promise<AuthResponse> {
    // Find first matching rule; if none is found, the request is rejected
    const rule = this.rules.find(o => matchesRule(req, o));
    if (!rule) return false;
    return executeRule(req, rule);
  }
}

// ====================================
// Rule filtering
// ====================================
// The request must match all of the rule's filters
const matchesRule = (req: AuthRequest, rule: AuthRule) => {
  if (!matchesFilter(req.viewerId, rule.viewerId)) return false;
  if (!matchesFilter(req.roleNames, rule.roleNames, true)) return false;
  if (!matchesFilter(req.operation, rule.operation)) return false;
  if (!matchesFilter(req.baseId, rule.baseId)) return false;
  if (!matchesFilter(req.baseType, rule.baseType)) return false;
  if (!matchesFilter(req.targetName, rule.targetName)) return false;
  if (!matchesFilter(req.targetId, rule.targetId)) return false;
  if (!matchesFilter(req.targetType, rule.targetType)) return false;
  if (!matchesFilter(req.targetBefore, rule.targetBefore)) return false;
  if (!matchesFilter(req.targetAfter, rule.targetAfter)) return false;
  if (!matchesFilter(req.isClientSide, rule.isClientSide)) return false;
  return true;
};

const matchesFilter = (actualValue, filterSpec: any, isPlural) => {
  if (filterSpec === undefined) return true;
  return isPlural
    ? matchesPlural(actualValue, filterSpec)
    : matchesSingular(actualValue, filterSpec);
};

const matchesSingular = (actualValue: any, filterSpec: any) => {
  if (filterSpec == null || typeof filterSpec !== 'object') {
    return actualValue === filterSpec;
  }
  const operators = Object.keys(filterSpec);
  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const refValue = filterSpec[operator];
    let matches = false;
    if (operator === '$is') {
      matches = actualValue === refValue;
    } else if (operator === '$isnt') {
      matches = actualValue !== refValue;
    } else if (operator === '$in') {
      matches = refValue.indexOf(actualValue) >= 0;
    } else if (operator === '$notIn') {
      matches = refValue.indexOf(actualValue) < 0;
    } else {
      throw new Error(
        `Unknown operator '${operator}' in auth filter (singular)`,
      );
    }
    if (!matches) return false;
  }
  return true;
};

const matchesPlural = (actualValues: any, filterSpec: any) => {
  if (filterSpec == null || typeof filterSpec !== 'object') {
    throw new Error('Plural filter in auth rule must be an object');
  }
  const operators = Object.keys(filterSpec);
  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const refValue = filterSpec[operator];
    let matches = false;
    if (operator === '$include') {
      matches = actualValues.indexOf(refValue) >= 0;
    } else if (operator === '$dontInclude') {
      matches = actualValues.indexOf(refValue) < 0;
    } else if (operator === '$includeAny' || operator === '$dontIncludeAny') {
      for (let k = 0; k < refValue.length; k++) {
        if (actualValues.indexOf(refValue[k])) {
          matches = true;
          break;
        }
      }
      if (operator === '$dontIncludeAny') matches = !matches;
    } else {
      throw new Error(`Unknown operator '${operator}' in auth filter (plural)`);
    }
    if (!matches) return false;
  }
  return true;
};

// ====================================
// Rule execution
// ====================================
const executeRule = async (req, rule) => {
  const { can } = rule;
  if (can === true || can === false) return can;
  const checks = Array.isArray(can) ? can : [can];
  for (let i = 1; i < checks.length; i++) {
    const check: AuthCheck = checks[i];

    // Route-based checks
    if (check.type === 'targetBefore->viewerId') {
      if (!req.hasOwnProperty('targetBefore')) return null; // missing data
      if (req.viewerId == null) throwNoViewer();
      const result = await req.checkRoute(
        req.targetBefore,
        check.route,
        req.viewerId,
      );
      if (!result) return false;
    } else if (check.type === 'targetAfter->viewerId') {
      if (!req.hasOwnProperty('targetBefore')) return null; // missing data
      if (!req.hasOwnProperty('targetAfter')) return null; // missing data
      if (req.viewerId == null) throwNoViewer();
      const result = await req.checkRoute(
        req.targetAfter,
        check.route,
        req.viewerId,
      );
      if (!result) return false;
    } else if (check.type === 'root->viewerId') {
      if (req.viewerId == null) throwNoViewer();
      const result = await req.checkRoute(null, check.route, req.viewerId);
      if (!result) return false;
    } else if (check.type === 'viewer->targetId') {
      if (req.viewer == null) throwNoViewer();
      if (req.targetId == null) throwNoTarget();
      const result = await req.checkRoute(
        req.viewer,
        check.route,
        req.targetId,
      );
      if (!result) return false;

      // Custom checks
    } else if (check.type === 'satisfies') {
      const { fn: fnSpec } = check;
      const fn = typeof fnSpec === 'function' ? fnSpec : eval(fnSpec);
      const result = await fn(req);
      if (result !== true) return result; // can be false or null (missing data)
    }
  }

  // All checks passed
  return true;
};

// ====================================
// Helpers
// ====================================
const throwNoViewer = () => {
  throw new Error('Auth route failed: no viewer');
};

const throwNoTarget = () => {
  throw new Error('Auth route failed: no target');
};

// ====================================
// Public
// ====================================
export default Authorizer;
