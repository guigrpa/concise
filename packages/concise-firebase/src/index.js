// @flow

/* eslint-disable prefer-template, no-param-reassign */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';

/* --
Output-only.

Output options:
* `file?` (`string`): if specified, output will be written to the specified path
-- */
type OutputOptions = {
  file?: string,
};

const VALIDATE = '.validate';
const ISO_8601 =
  '/^\\d\\d\\d\\d-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(\\.\\d+)?(([+-]\\d\\d:\\d\\d)|Z)?$/i';

// ====================================
// Main
// ====================================
const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
  utils: SchemaUtils,
) => {
  const rules = writeRulesForAllModels(utils.preprocessedSchema);
  if (options.file) {
    fs.writeFileSync(options.file, JSON.stringify(rules, null, 2), 'utf8');
  }
  return rules;
};

// ====================================
// Rule writer
// ====================================
const writeRulesForAllModels = ({ models }) => {
  const rules = {};
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
    rules[modelName] = {
      [`$${modelName}Id`]: writeRulesForModel(models, modelName),
    };
  });
  return rules;
};

const writeRulesForModel = (models, modelName) => {
  const model = models[modelName];
  const modelRules = {};

  // Required fields
  const requiredFields = getRequiredFields(model);
  if (requiredFields.length) {
    const list = requiredFields.map(o => `'${o}'`).join(', ');
    modelRules[VALIDATE] = `newData.hasChildren([${list}])`;
  }

  // Field rules
  writeRulesForModelFields(modelRules, model);

  return modelRules;
};

const writeRulesForModelFields = (modelRules, { fields, relations }) => {
  const rules = {};
  Object.keys(fields).forEach(name => {
    const field = fields[name];
    if (field.isPrimaryKey) return;
    const constraints = getFieldConstraints(field);
    if (constraints.length) {
      if (modelRules[name] == null) modelRules[name] = {};
      modelRules[name][VALIDATE] = constraints.join(' && ');
    }
  });
  Object.keys(relations).forEach(name => {
    const relation = relations[name];
    const { fkName, isPlural } = relation;
    if (modelRules[fkName] == null) modelRules[fkName] = {};
    const fieldRules = modelRules[fkName];
    if (isPlural) {
      if (fieldRules.$id == null) fieldRules.$id = {};
      fieldRules.$id[VALIDATE] = 'newData.val() === true';
    } else {
      fieldRules[VALIDATE] = 'newData.isString()';
    }
  });
  return rules;
};

const getFieldConstraints = field => {
  const constraints = [];

  // Type rules
  const { type } = field;
  if (type === 'string' || type === 'uuid') {
    constraints.push('newData.isString()');
  } else if (type === 'boolean') {
    constraints.push('newData.isBoolean()');
  } else if (type === 'number') {
    constraints.push('newData.isNumber()');
  } else if (type === 'date') {
    constraints.push('newData.isString()');
    constraints.push(`newData.val().matches(${ISO_8601})`);
  }

  // Other validations
  if (field.isOneOf != null) {
    const choiceConstraints = field.isOneOf.map(o => `newData.val() === ${o}`);
    constraints.push(`(${choiceConstraints.join(' || ')})`);
  }
  if (field.hasAtLeastChars != null) {
    constraints.push(`newData.val().length >= ${field.hasAtLeastChars}`);
  }
  if (field.hasAtMostChars != null) {
    constraints.push(`newData.val().length <= ${field.hasAtMostChars}`);
  }
  if (field.hasLengthWithinRange != null) {
    constraints.push(`newData.val().length >= ${field.hasLengthWithinRange[0]}`);
    constraints.push(`newData.val().length <= ${field.hasLengthWithinRange[1]}`);
  }
  if (field.isEmail) {
    constraints.push('newData.val().matches(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,4}$/i)');
  }
  if (field.isUrl) {
    console.log('WARNING: isUrl validation is currently unsupported');
  }
  if (field.isIp) {
    console.log('WARNING: isIp validation is currently unsupported');
  }
  if (field.isCreditCard) {
    console.log('WARNING: isCreditCard validation is currently unsupported');
  }
  if (field.matchesPattern != null) {
    constraints.push(`newData.val().matches(/${field.matchesPattern[0]}/${field.matchesPattern[1]})`);
  }
  if (field.isGte != null) {
    constraints.push(`newData.val() >= ${field.isGte}`);
  }
  if (field.isLte != null) {
    constraints.push(`newData.val() <= ${field.isLte}`);
  }
  if (field.isWithinRange != null) {
    constraints.push(`newData.val() >= ${field.isWithinRange[0]}`);
    constraints.push(`newData.val() <= ${field.isWithinRange[1]}`);
  }
  if (field.satisfies != null) {
    constraints.push(field.satisfies);
  }
  return constraints;
};

// ====================================
// Helpers
// ====================================
const getRequiredFields = ({ fields, relations }) => {
  const required = [];
  Object.keys(fields).forEach(name => {
    const field = fields[name];
    if (!field.existsInServer) return;
    if (field.isRequired || field.isPrimaryKey) {
      required.push(name);
    }
  });
  Object.keys(relations).forEach(name => {
    const relation = relations[name];
    if (relation.isRequired) required.push(relation.fkName);
  });
  return required;
};

// ====================================
// Public
// ====================================
export { output };
