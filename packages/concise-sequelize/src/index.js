// @flow

/* eslint-disable prefer-template, no-param-reassign */

import type {
  Schema,
  OutputProcessor,
  SchemaUtils,
  ProcessedField,
} from 'concise-types';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

Output options:
* `Sequelize` (`Object`): the Sequelize class
* `sequelize` (`Object`): a Sequelize instance
-- */
type OutputOptions = {
  Sequelize: Object,
  sequelize: Object,
};

// ====================================
// Main
// ====================================
const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
  utils: SchemaUtils,
) => {
  const preprocessedSchema = utils.preprocess(schema);
  const { Sequelize, sequelize } = options;
  const db = { Sequelize, sequelize };
  defineModels(db, preprocessedSchema);
  defineRelations(db, preprocessedSchema);
  return db;
};

// ====================================
// Spec builders
// ====================================
const defineModels = (db, schema) => {
  const { models } = schema;
  Object.keys(models).forEach(modelName => {
    // console.log(`${modelName}`);
    const model = models[modelName];
    const className = upperFirst(modelName);
    db[className] = db.sequelize.define(modelName, defineFields(db, model), {
      validate: {},
      classMethods: {},
      instanceMethods: {},
    });
  });
};

const defineFields = (db, model) => {
  const { fields } = model;
  const out = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    const newField = {};
    const { isPrimaryKey, isAutoIncremented, defaultValue } = field;
    const sequelizeType = getFieldType(field);
    newField.type = db.Sequelize[sequelizeType];
    addFieldValidations(field, newField);
    if (isPrimaryKey != null) newField.primaryKey = isPrimaryKey;
    if (isAutoIncremented != null) newField.autoIncrement = isAutoIncremented;
    if (defaultValue !== undefined) newField.defaultValue = defaultValue;
    // console.log(` - ${fieldName}: ${sequelizeType}`);
    out[fieldName] = newField;
  });
  return out;
};

const defineRelations = (db, schema) => {
  const { models } = schema;
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    const classTail = upperFirst(modelName);
    const { relations } = model;
    Object.keys(relations).forEach(relationName => {
      const relation = relations[relationName];
      const classHead = upperFirst(relation.model);
      const options = {};
      let relationType;
      if (relation.isInverse) {
        relationType = relation.isPlural ? 'hasMany' : 'hasOne';
      } else {
        if (relation.isPlural) {
          /* eslint-disable no-console */
          console.warn(`Direct plural relation (${modelName} -> ${relation.model}) is not supported`);
          console.warn('Use a cross table instead');
          /* eslint-enable no-console */
          return;
        }
        if (relationName !== relation.model) options.as = relationName;
        if (relation.sequelizeSkipReferentialIntegrity) options.constraints = false;
        relationType = 'belongsTo';
      }
      // console.log(`${classTail} ${relationType} ${relationName} (${classHead})`);
      db[classTail][relationType](db[classHead], options);
    });
  });
};

// ====================================
// Helpers
// ====================================
const getFieldType = (field: ProcessedField) => {
  const { type } = field;
  if (type === 'string') return field.isLong ? 'TEXT' : 'STRING';
  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'uuid') return 'STRING';
  if (type === 'json') return 'JSONB';
  if (type === 'number') return field.isFloat ? 'DOUBLE' : 'INTEGER';
  if (type === 'date') {
    if (field.noDate) return 'TIME';
    if (field.noTime) return 'DATEONLY';
    return 'DATE';
  }
  throw new Error(`UNSUPPORTED_FIELD_TYPE ${type}`);
};

const addFieldValidations = (field: ProcessedField, newField) => {
  newField.validate = {};
  const validations = field.validations || {};
  Object.keys(validations).forEach(key => {
    const val: any = validations[key];
    switch (key) {
      case 'isRequired':
        newField.allowNull = false;
        break;
      case 'isUnique':
        newField.unique = true;
        break;
      case 'isOneOf':
        newField.validate.isIn = {
          args: [val],
          msg: 'INVALID:isOneOf',
        };
        break;
      case 'hasAtLeastChars':
        newField.validate.len = {
          args: [val, Infinity],
          msg: 'INVALID:hasAtLeastChars',
        };
        break;
      case 'hasAtMostChars':
        newField.validate.len = {
          args: [-Infinity, val],
          msg: 'INVALID:hasAtMostChars',
        };
        break;
      case 'hasLengthWithinRange':
        newField.validate.len = {
          args: val,
          msg: 'INVALID:hasLengthWithinRange',
        };
        break;
      case 'isEmail':
        newField.validate.isEmail = { msg: 'INVALID:isEmail' };
        break;
      case 'isUrl':
        newField.validate.isUrl = { msg: 'INVALID:isUrl' };
        break;
      case 'isIp':
        newField.validate.isIp = { msg: 'INVALID:isIp' };
        break;
      case 'isCreditCard':
        newField.validate.isCreditCard = { msg: 'INVALID:isCreditCard' };
        break;
      case 'matchesPattern':
        newField.validate.is = { args: val, msg: 'INVALID:matchesPattern' };
        break;
      case 'isGte':
        newField.validate.min = { args: val, msg: 'INVALID:isGte' };
        break;
      case 'isLte':
        newField.validate.max = { args: val, msg: 'INVALID:isLte' };
        break;
      case 'isWithinRange':
        newField.validate.min = { args: val[0], msg: 'INVALID:isGte' };
        newField.validate.max = { args: val[1], msg: 'INVALID:isLte' };
        break;
      case 'satisfies':
        // SECURITY NOTICE: We're using `eval`:
        // I guess if you have access to schema contents,
        // you have access to the whole backend, right?
        newField.validate.satisfies = eval(val);  // eslint-disable-line no-eval
        break;
      default:
        throw new Error(`VALIDATION_UNSUPPORTED:${key}`);
    }
  });
  const { type } = field;
  if (type === 'number') {
    newField.validate.isDecimal = { msg: 'INVALID:isNumber' };
  }
  if (type === 'date') {
    newField.validate.isDate = { msg: 'INVALID:isDate' };
  }
};

// ====================================
// Public
// ====================================
export { output };
