// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';
import upperFirst from 'lodash.upperfirst';

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
// GraphQL writer
// ====================================
const writeTypes = ({ models }) => {
  let out = '';
  Object.keys(models).forEach(modelName => {
    out += writeType(models, modelName);
  });
  return out;
};

const writeType = (models, modelName) => {
  const { description, fields = {}, relations = {} } = models[modelName];
  const upperModelName: string = upperFirst(modelName);
  const allSpecs = [];
  Object.keys(fields).forEach(fieldName => {
    allSpecs.push(writeField(fieldName, fields[fieldName]));
  });
  Object.keys(relations).forEach(fieldName => {
    allSpecs.push(writeField(fieldName, relations[fieldName]));
  });
  const contents = allSpecs.length ? `\n  ${allSpecs.join('\n  ')}\n` : '';
  return (
    `# ${upperModelName}\n` +
    (description ? `# ${description}\n` : '') +
    `type ${upperModelName} {${contents}}\n\n`
  );
};

const writeField = (name, specs: any) => {
  const typeStr = writeFieldType(specs);
  const comment = specs.description ? `  # ${specs.description}` : '';
  return `${name}: ${typeStr}${comment}`;
};

const writeFieldType = specs => {
  const { type, model, primaryKey, validations, plural } = specs;
  let out;
  if (primaryKey) out = 'ID';
  else if (model) out = upperFirst(model);
  else if (type === 'boolean') out = 'Boolean';
  else if (type === 'number') out = specs.float ? 'Float' : 'Int';
  else out = 'String';
  if (plural) out = `[${out}]`;
  if (primaryKey || (validations && validations.required)) out += '!';
  return out;
};

// ====================================
// Public
// ====================================
export { output };
