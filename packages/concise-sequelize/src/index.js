// @flow

/* eslint-disable prefer-template, no-param-reassign */

import { merge, addLast } from 'timm';
import type {
  Schema,
  OutputProcessor,
  SchemaUtils,
  ProcessedSchema,
  ProcessedModel,
  ProcessedField,
  MapOf,
  ModelName,
} from 'concise-types';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

Output options:
* `Sequelize` (`Object`): the Sequelize class
* `sequelize` (`Object`): a Sequelize instance
* `extensions?` (`MapOf<ModelName, SequelizeExtensions>`): object that
  associates a given model (or `$all` for all models) to a set of
  extensions (or customizations). **Description to be completed (see
  typedefs and tests for the time being)**
-- */
type OutputOptions = {
  Sequelize: Object,
  sequelize: Object,
  extensions?: MapOf<ModelName, SequelizeExtensions>,
};

type SequelizeExtensions = {
  validate: (context: SequelizeExtensionContext) => MapOf<string, Function>,
  indexes: (context: SequelizeExtensionContext) => Array<Object>,
  classMethods: (context: SequelizeExtensionContext) => MapOf<string, Function>,
  instanceMethods: (
    context: SequelizeExtensionContext,
  ) => MapOf<string, Function>,
  hooks: (context: SequelizeExtensionContext) => MapOf<string, Function>,
};

type SequelizeExtensionContext = {
  db: {
    sequelize: Object,
    Sequelize: Object,
    /* + all models... */
  },
  model: ProcessedModel,
  modelName: ModelName,
  className: string,
  schema: ProcessedSchema,
};

// ====================================
// Main
// ====================================
const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
  utils: SchemaUtils,
) => {
  const { preprocessedSchema } = utils;
  const { Sequelize, sequelize } = options;
  const db = { Sequelize, sequelize };
  defineModels(db, preprocessedSchema, options);
  defineRelations(db, preprocessedSchema);
  return db;
};

// ====================================
// Define models
// ====================================
const defineModels = (db, schema, options) => {
  Object.keys(schema.models).forEach(modelName => {
    defineModel(db, schema, modelName, options);
  });
};

const defineModel = (db, schema, modelName, options) => {
  // console.log(`${modelName}`);
  const model = schema.models[modelName];
  if (!model.existsInServer) return;
  const className = upperFirst(modelName);
  const definitionOptions = {
    validate: {},
    indexes: [],
    classMethods: {},
    instanceMethods: {},
    hooks: {},
  };
  const context = { db, model, modelName, className, schema };
  addDefinitionOptions(definitionOptions, '$all', options, context);
  addDefinitionOptions(definitionOptions, modelName, options, context);
  const fields = defineFields(db, model);
  db[className] = db.sequelize.define(modelName, fields, definitionOptions);
};

const defineFields = (db, model) => {
  const { fields } = model;
  const out = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    if (!field.existsInServer) return;
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

const addDefinitionOptions = (
  definitionOptions,
  modelName,
  options,
  context,
) => {
  const extensions =
    options && options.extensions && options.extensions[modelName];
  if (!extensions) return;
  if (extensions.validate) {
    definitionOptions.validate = merge(
      definitionOptions.validate,
      extensions.validate(context),
    );
  }
  if (extensions.indexes) {
    definitionOptions.indexes = addLast(
      definitionOptions.indexes,
      extensions.indexes(context),
    );
  }
  if (extensions.classMethods) {
    definitionOptions.classMethods = merge(
      definitionOptions.classMethods,
      extensions.classMethods(context),
    );
  }
  if (extensions.instanceMethods) {
    definitionOptions.instanceMethods = merge(
      definitionOptions.instanceMethods,
      extensions.instanceMethods(context),
    );
  }
  if (extensions.hooks) {
    definitionOptions.hooks = merge(
      definitionOptions.hooks,
      extensions.hooks(context),
    );
  }
};

// ====================================
// Define relations
// ====================================
const defineRelations = (db, schema) => {
  const { models } = schema;
  Object.keys(models).forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      defineRelation(db, modelName, relationName, relations[relationName]);
    });
  });
};

const defineRelation = (db, modelName, relationName, relation) => {
  const classTail = upperFirst(modelName);
  const classHead = upperFirst(relation.model);
  const options = {};
  let relationType;
  if (relation.isInverse) {
    relationType = relation.isPlural ? 'hasMany' : 'hasOne';
  } else {
    if (relation.isPlural) {
      /* eslint-disable no-console */
      console.warn(
        `Direct plural relation (${modelName} -> ${relation.model}) ` +
          'is not supported. Use a cross table instead',
      );
      /* eslint-enable no-console */
      return;
    }
    if (relationName !== relation.model) options.as = relationName;
    if (relation.sequelizeSkipReferentialIntegrity) {
      options.constraints = false;
    }
    relationType = 'belongsTo';
  }
  // console.log(`${classTail} ${relationType} ${relationName} (${classHead})`);
  db[classTail][relationType](db[classHead], options);
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

const addFieldValidations = (field: any, newField) => {
  newField.validate = {};
  Object.keys(field).forEach(key => {
    const val: any = field[key];
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
        newField.validate.isIP = { msg: 'INVALID:isIp' };
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
        newField.validate.satisfies = eval(val); // eslint-disable-line no-eval
        break;
      default:
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
