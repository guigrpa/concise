// @flow

/* eslint-disable prefer-template */

import type { Schema, OutputProcessor, SchemaUtils, Field } from 'concise-types';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

Output options:
* `sequelize` (`Object`)
-- */
type OutputOptions = {
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
  const { sequelize } = options;
  const db = { sequelize };
  defineModels(db, preprocessedSchema);
  defineRelations(db, preprocessedSchema);
  return db;
};

/* eslint-disable no-param-reassign */
const defineModels = (db, schema) => {
  const { models } = schema;
  Object.keys(models).forEach(modelName => {
    console.log(`${modelName}`)
    const model = models[modelName];
    const className = upperFirst(modelName);
    db[className] = db.sequelize.define(modelName, defineFields(db, model), {
      validate: {},
      classMethods: {},
      instanceMethods: {},
    });
  });
};

const defineRelations = (db, schema) => {};
/* eslint-enable no-param-reassign */

// ====================================
// Spec builders
// ====================================
const defineFields = (db, model) => {
  const { fields } = model;
  const out = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    const newField = {};
    const { isPrimaryKey, isAutoIncrement, defaultValue } = field;
    const sequelizeType = getFieldType(field);
    newField.type = db.sequelize[sequelizeType];
    if (isPrimaryKey != null) newField.primaryKey = isPrimaryKey;
    if (isAutoIncrement != null) newField.autoIncrement = isAutoIncrement;
    if (defaultValue !== undefined) newField.defaultValue = defaultValue;
    console.log(` - ${fieldName}: ${sequelizeType}`)
    out[fieldName] = newField;
  });
  return out;
};

const getFieldType = (field: Field) => {
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

// ====================================
// Public
// ====================================
export { output };
