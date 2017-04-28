// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';

/* --
Output-only.

Output options:
* `schema?` (`string`): PostgreSQL schema; if unspecified, no schema is used
  in the SQL definitions (which corresponds to the `public` schema)
-- */
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
  utils: SchemaUtils,
) => {
  const raw = writeSchema(utils.preprocessedSchema, options);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// SQL writer
// ====================================
const writeSchema = ({ models }, options) => {
  let out = '';

  // Write table definitions
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
    out += writeTable(models, modelName, options);
  });

  // Add foreign key constraints
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
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
    if (!fields[fieldName].existsInServer) return;
    const { sqlField, sqlFieldComment, sqlFieldConstraints } =
      writeField(models, modelName, tableName, fieldName, options);
    if (sqlField) sqlFields.push(sqlField);
    if (sqlFieldComment) sqlComments.push(sqlFieldComment);
    if (sqlFieldConstraints) sqlConstraints = sqlConstraints.concat(sqlFieldConstraints);
  });
  Object.keys(relations).forEach(relationName => {
    if (
      relations[relationName].isInverse ||
      relations[relationName].isPlural
    ) return;
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
  Object.keys(relations).forEach(relationName => {
    const relation = relations[relationName];
    if (relation.isInverse) return;
    if (relation.isInverse || relation.isPlural) return;
    const fieldName = `${relationName}Id`;

    let remoteTableName = `"${relation.model}"`;
    if (options.schema) remoteTableName = `"${options.schema}".${remoteTableName}`;
    constraints.push(
      `ALTER TABLE ${tableName}\n` +
      `  ADD CONSTRAINT "${modelName}_fk_${fieldName}"\n` +
      `  FOREIGN KEY (${fieldName})\n` +
      `  REFERENCES ${remoteTableName}\n` +
      '  ON UPDATE CASCADE ON DELETE NO ACTION;\n'
        // ON UPDATE CASCADE: when the PK changes, change the FK
        // ON DELETE NO ACTION: referencing rows are not altered;
        // but if there are referencing rows at the time the referenced row must be deleted,
        // the operation will fail
    );
  });
  return constraints.join('');
};

const writeField = (models, modelName, tableName, fieldName) => {
  const field = models[modelName].fields[fieldName];
  const segments = [`"${fieldName}"`, writeFieldType(field)];
  if (field.isRequired) segments.push('NOT NULL');
  const { defaultValue } = field;
  if (defaultValue != null) {
    if (defaultValue === true || defaultValue === false) {
      segments.push(`DEFAULT ${String(defaultValue)}`);
    } else if (defaultValue instanceof Date) {
      segments.push(`DEFAULT '${defaultValue.toISOString()}'`);
    } else {
      segments.push(`DEFAULT '${String(defaultValue)}'`);
    }
  } else if (field.type === 'uuid') {
    segments.push('DEFAULT uuid_generate_v1mc()');
  }
  const sqlField = segments.join(' ');
  const sqlFieldComment = field.description
    ? writeComment('COLUMN', `${tableName}."${fieldName}"`, field.description)
    : undefined;
  const sqlFieldConstraints = [];
  if (field.isPrimaryKey) {
    sqlFieldConstraints.push(
      `CONSTRAINT "${modelName}_pk_${fieldName}" PRIMARY KEY ("${fieldName}")`,
    );
  }
  if (field.isUnique) {
    sqlFieldConstraints.push(
      `CONSTRAINT "${modelName}_unique_${fieldName}" UNIQUE ("${fieldName}")`,
    );
  }
  return { sqlField, sqlFieldComment, sqlFieldConstraints };
};

const writeForeignKey = (models, modelName, tableName, relationName) => {
  const relation = models[modelName].relations[relationName];
  const fieldName = `${relationName}Id`;
  const sqlFields = [];

  // Foreign key
  const segments = [`"${fieldName}"`, writeFieldType(relation)];
  if (relation.isRequired) segments.push('NOT NULL');
  sqlFields.push(segments.join(' '));

  const description: any = relation.description;
  const sqlFieldComment = description
    ? writeComment('FIELD', `${tableName}."${fieldName}"`, description)
    : undefined;
  return { sqlFields, sqlFieldComment };
};

const writeFieldType = (field: any) => {
  const { type } = field;
  if (type === 'string') return field.isLong ? 'text' : 'character varying(255)';
  if (type === 'number') return field.isFloat ? 'double precision' : 'integer';
  if (type === 'date') return 'timestamp with time zone';
  if (type === 'json') return 'jsonb';
  return field.type;
};

const writeComment = (type, object, cmt: any) =>
  `COMMENT ON ${type} ${object} IS '${cmt}';`;

// ====================================
// Public
// ====================================
export { output };
