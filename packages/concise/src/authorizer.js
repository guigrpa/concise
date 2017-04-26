// @flow

import type { AuthRule, AuthRequest, AuthRoutes } from 'concise-types';

/* eslint-disable no-prototype-builtins, no-eval */

// ====================================
// Helpers
// ====================================
const isObject = value => {
  const type = typeof value;
  return value != null && (type === 'object' || type === 'function');
};

// The request must match all of the rule's filters
const matchesRule = (req, rule: AuthRule) => {
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

const matchesFilter = (actualValue, filterSpec, isPlural) => {
  if (filterSpec === undefined) return true;
  return isPlural
    ? matchPluralFilterSpec(actualValue, filterSpec)
    : matchSingularFilterSpec(actualValue, filterSpec);
};

const matchSingularFilterSpec = (actualValue, filterSpec) => {
  if (!isObject(filterSpec)) return actualValue === filterSpec;
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

const matchPluralFilterSpec = (actualValues, filterSpec) => {
  if (!isObject(filterSpec)) {
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

const processRoutes = async (req, fromNode, routes0: AuthRoutes, checkValue) => {
  if (routes0 == null) return true;
  const routes = Array.isArray(routes0) ? routes0 : [routes0];
  const { checkRoute } = req;
  for (let i = 0; i < routes.length; i++) {
    if (!checkRoute(fromNode, routes[i], checkValue)) return false;
  }
  return true;
};

// ====================================
// main
// ====================================
class Authorizer {
  rules: Array<AuthRule>;

  constructor(rules: Array<AuthRule>) {
    this.rules = rules;
  }

  async can(req: AuthRequest) {
    // Find first matching rule; if none is found, the request is rejected
    const rule = this.rules.find(o => matchesRule(req, o));
    if (!rule) return false;

    // Process routes
    const {
      canIfFindsViewerIdFromTargetBefore,
      canIfFindsViewerIdFromTargetAfter,
      canIfFindsViewerIdFromRoot,
      canIfFindsTargetIdFromViewer,
    } = rule;
    if (canIfFindsViewerIdFromTargetBefore) {
      if (!req.hasOwnProperty('targetBefore')) return null;
      if (req.viewerId == null) {
        throw new Error('Auth route failed: no viewerId!');
      }
      const check = await processRoutes(
        req,
        req.targetBefore,
        canIfFindsViewerIdFromTargetBefore,
        req.viewerId,
      );
      if (check !== true) return check;
    }
    if (canIfFindsViewerIdFromTargetAfter) {
      if (!req.hasOwnProperty('targetBefore')) return null;
      if (!req.hasOwnProperty('targetAfter')) return null;
      if (req.viewerId == null) {
        throw new Error('Auth route failed: no viewerId!');
      }
      const check = await processRoutes(
        req,
        req.targetAfter,
        canIfFindsViewerIdFromTargetAfter,
        req.viewerId,
      );
      if (check !== true) return check;
    }
    if (canIfFindsViewerIdFromRoot) {
      if (req.viewerId == null) {
        throw new Error('Auth route failed: no viewerId!');
      }
      const check = await processRoutes(
        req,
        null,
        canIfFindsViewerIdFromRoot,
        req.viewerId,
      );
      if (check !== true) return check;
    }
    if (canIfFindsTargetIdFromViewer) {
      if (req.viewer == null) {
        throw new Error('Auth route failed: no viewer!');
      }
      if (req.targetId == null) {
        throw new Error('Auth route failed: no targetId!');
      }
      const check = await processRoutes(
        req,
        req.viewer,
        canIfFindsTargetIdFromViewer,
        req.targetId,
      );
      if (check !== true) return check;
    }

    // Process `can`
    const { can } = rule;
    if (can != null) {
      if (can === true || can === false) return can;
      const fn = typeof can === 'function' ? can : eval(can);
      let check = fn(req);
      if (check == null) return check;
      if (isObject(check) && check.then) check = await check;
      if (check !== true) return check;
    }

    // All checks passed
    return true;
  }
}

// ====================================
// Public
// ====================================
export default Authorizer;
