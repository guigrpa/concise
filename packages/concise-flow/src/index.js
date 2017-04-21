// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

No specific options.
-- */
type OutputOptions = {
  file?: string,
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
  const raw = writeTypes(preprocessedSchema);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// Flow writer
// ====================================
const writeTypes = ({ models }) => {
  let out = '';
  Object.keys(models).forEach(modelName => {
    out += writeType(models, modelName);
  });
  return out;
};

const writeType = (models, modelName) => {
  const {
    description,
    fields = {},
    relations = {},
  } = models[modelName];
  const upperModelName = upperFirst(modelName);
  const allSpecs = [];
  Object.keys(fields).forEach(fieldName => {
    allSpecs.push(writeField(fieldName, fields[fieldName]));
  });
  Object.keys(relations).forEach(fieldName => {
    const relation = relations[fieldName];
    if (relation.isInverse) return;
    allSpecs.push(writeField(relation.fkName, relation));
  });
  const contents = allSpecs.length
    ? `\n  ${allSpecs.join('\n  ')}\n`
    : '';
  return '' +
    `// ${upperModelName}\n` +
    (description ? `// ${description}\n` : '') +
    `type ${upperModelName} = {${contents}};\n\n`;
};

const writeField = (name, specs: any) => {
  const isRequired = specs.validations && specs.validations.isRequired ? '' : '?';
  let typeStr = writeFieldType(specs.type);
  if (specs.isPlural) typeStr = `Array<${typeStr}>`;
  const comment = specs.description ? `  // ${specs.description}` : '';
  return `${name}${isRequired}: ${typeStr},${comment}`;
};

const writeFieldType = type => {
  if (type === 'uuid') return 'string';
  if (type === 'json') return 'any';
  if (type === 'date') return 'Date';
  return type;
};

// ====================================
// Public
// ====================================
export { output };
