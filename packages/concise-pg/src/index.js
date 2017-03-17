// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import { omit, merge, setIn } from 'timm';
import type { Schema, OutputProcessor } from 'concise-types';

type OutputOptions = {
  file?: string,
  schema?: string,
};

// ====================================
// Main
// ====================================
const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
) => {
  const preprocessedSchema = preprocess(schema);
  const raw = writeSchema(preprocessedSchema, options);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// Preprocessor
// ====================================
const preprocess = schema => {
  const models = {};

  // Process includes
  Object.keys(schema.models).forEach(modelName => {
    let model = schema.models[modelName];
    if (model.includeOnly) return;
    if (model.includes) {
      Object.keys(model.includes).forEach(includeName => {
        const include = schema.models[includeName];
        if (!include) throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
        const { fields, relations } = include;
        model = merge(omit(model, ['includes']), {
          fields: fields ? merge(fields, model.fields) : undefined,
          relations: relations ? merge(relations, model.relations) : undefined,
        });
      });
    }
    models[modelName] = model;
  });

  // Process relation field types
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    Object.keys(model.relations || {}).forEach(relationName => {
      const relation = model.relations[relationName];
      const relatedModel = models[relation.model];
      if (!relatedModel) {
        throw new Error(`RELATED_MODEL_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      const idField = relatedModel && relatedModel.fields && relatedModel.fields.id;
      if (!idField) {
        throw new Error(`ID_FIELD_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      models[modelName] = setIn(
        models[modelName],
        ['relations', relationName, 'type'],
        idField.type
      );
    });
  });

  return { models };
};

// ====================================
// SQL writer
// ====================================
const writeSchema = ({ models }, options) => {
  let out = '';

  // Write table definitions
  Object.keys(models).forEach(modelName => {
    out += writeTable(models, modelName, options);
  });

  // Add foreign key constraints
  Object.keys(models).forEach(modelName => {
    out += writeForeignKeyConstraints(models, modelName, options);
  });
  return out;
};

const writeTable = (models, modelName, options) => {
  let sqlFields = [];
  let sqlConstraints = [];
  const sqlComments = [];
  let tableName = `"${modelName}"`;
  if (options.schema) tableName = `"${options.schema}".${tableName}`;
  const {
    description,
    fields = {},
    relations = {},
  } = models[modelName];
  if (description) {
    sqlComments.push(writeComment('TABLE', tableName, description));
  }
  Object.keys(fields).forEach(fieldName => {
    const { sqlField, sqlFieldComment, sqlFieldConstraints } =
      writeField(models, modelName, tableName, fieldName, options);
    if (sqlField) sqlFields.push(sqlField);
    if (sqlFieldComment) sqlComments.push(sqlFieldComment);
    if (sqlFieldConstraints) sqlConstraints = sqlConstraints.concat(sqlFieldConstraints);
  });
  Object.keys(relations).forEach(relationName => {
    const { sqlFields: someSqlFields, sqlFieldComment } =
      writeForeignKey(models, modelName, tableName, relationName, options);
    if (someSqlFields) sqlFields = sqlFields.concat(someSqlFields);
    if (sqlFieldComment) sqlComments.push(sqlFieldComment);
  });
  const sqlTableEntries = sqlFields.concat(sqlConstraints);
  return `CREATE TABLE ${tableName} (\n` +
    `${sqlTableEntries.map(o => `  ${o}`).join(',\n')}\n` +
    ');\n' +
    sqlComments.map(o => `${o}\n`).join('') +
    '\n';
};

const writeForeignKeyConstraints = (models, modelName, options) => {
  let tableName = `"${modelName}"`;
  if (options.schema) tableName = `"${options.schema}".${tableName}`;
  const constraints = [];
  const { relations } = models[modelName];
  Object.keys(relations || {}).forEach(relationName => {
    const relation = relations[relationName];
    const fieldName = `${relationName}Id`;

    // Discard polymorphic relationships (TBC)
    if (Array.isArray(relation.model)) return;

    let remoteTableName = `"${relation.model}"`;
    if (options.schema) remoteTableName = `"${options.schema}".${remoteTableName}`;
    constraints.push(
      `ALTER TABLE ${tableName}\n` +
      `  ADD CONSTRAINT "${modelName}_fk_${fieldName}"\n` +
      `  FOREIGN KEY (${fieldName})\n` +
      `  REFERENCES ${remoteTableName}\n` +
      '  ON UPDATE CASCADE ON DELETE NO ACTION;'
        // ON UPDATE CASCADE: when the PK changes, change the FK
        // ON DELETE NO ACTION: referencing rows are not altered;
        // but if there are referencing rows at the time the referenced row must be deleted,
        // the operation will fail
    );
  });
  return constraints.join('\n');
};

const writeField = (models, modelName, tableName, fieldName) => {
  const field = models[modelName].fields[fieldName];
  const segments = [`"${fieldName}"`, writeFieldType(field)];
  if (field.validations && field.validations.required) {
    segments.push('NOT NULL');
  }
  const { default: defVal } = field;
  if (defVal != null) {
    if (defVal === true || defVal === false) {
      segments.push(`DEFAULT ${defVal}`);
    } else {
      segments.push(`DEFAULT '${defVal}'`);
    }
  } else if (field.type === 'uuid') {
    segments.push('DEFAULT uuid_generate_v1mc()');
  }
  const sqlField = segments.join(' ');
  const sqlFieldComment = field.description
    ? writeComment('COLUMN', `${tableName}."${fieldName}"`, field.description)
    : undefined;
  const sqlFieldConstraints = [];
  if (field.primaryKey) {
    sqlFieldConstraints.push(`CONSTRAINT "${modelName}_pk" PRIMARY KEY (${fieldName})`);
  }
  return { sqlField, sqlFieldComment, sqlFieldConstraints };
};

const writeForeignKey = (models, modelName, tableName, relationName) => {
  const relation = models[modelName].relations[relationName];
  const fieldName = `${relationName}Id`;
  const sqlFields = [];
  const required = relation.validations && relation.validations.required;
  const polymorphic = Array.isArray(relation.model);
  if (polymorphic) return { sqlFields: [], sqlFieldComment: undefined };

  // Foreign key
  let segments;
  segments = [`"${fieldName}"`, writeFieldType(relation)];
  if (required) segments.push('NOT NULL');
  sqlFields.push(segments.join(' '));

  // // For polymorphic relationships, additional qualifier
  // if (polymorphic) {
  //   segments = [`"${relationName}Type"`, writeFieldType({ type: 'string' })];
  //   if (required) segments.push('NOT NULL');
  //   sqlFields.push(segments.join(' '));
  // }

  const sqlFieldComment = relation.description
    ? writeComment('FIELD', `${tableName}."${fieldName}"`, relation.description)
    : undefined;
  return { sqlFields, sqlFieldComment };
};

const writeFieldType = field => {
  const { type } = field;
  if (type === 'string') return field.long ? 'text' : 'character varying(255)';
  if (type === 'number') return field.float ? 'double precision' : 'integer';
  if (type === 'date') return 'timestamp with time zone';
  if (type === 'json') return 'jsonb';
  return field.type;
};

const writeComment = (type, object, cmt) =>
  `COMMENT ON ${type} ${object} IS '${cmt}';`;

// ====================================
// Public
// ====================================
export { output };
