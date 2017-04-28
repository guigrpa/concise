// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';
import { omit } from 'timm';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

Output options:
* `relay?` (`boolean` = `false`): include `Node` interface
  and `node` root field, define connections, etc.
* `storyboard?` (`boolean` = `false`): include `storyId` field
  in mutation input types to support end-to-end Storyboard stories
-- */
type OutputOptions = {
  file?: string,
  relay?: boolean,
  storyboard?: boolean,
};

const RELAY_FIXTURES =
  '# An object with an ID\n' +
  'interface Node {\n' +
  '  # The id of the object\n' +
  '  id: ID!\n' +
  '}\n\n' +
  '# Information about pagination in a connection\n' +
  'type PageInfo {\n' +
  '  # When paginating forwards, are there more items?\n' +
  '  hasNextPage: Boolean!\n' +
  '  # When paginating backwards, are there more items?\n' +
  '  hasPreviousPage: Boolean!\n' +
  '  # When paginating backwards, the cursor to continue\n' +
  '  startCursor: String\n' +
  '  # When paginating forwards, the cursor to continue\n' +
  '  endCursor: String\n' +
  '}\n\n';

// ====================================
// Main
// ====================================
const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
  utils: SchemaUtils,
) => {
  const raw = writeTypes(utils.preprocessedSchema, options);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// GraphQL writer
// ====================================
const writeTypes = ({ models }, options) => {
  let out = '';
  const relay = options.relay;
  if (relay) out += RELAY_FIXTURES;
  out += writeRootQuery(models, options);
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
    out += writeType(models, modelName, options);
    out += writeMutationTypes(models, modelName, 'create', options);
    out += writeMutationTypes(models, modelName, 'update', options);
  });
  out += writeRootMutation(models);
  return out;
};

const writeRootQuery = (models, { relay }) => {
  const querySpecs = [];
  Object.keys(models).forEach(modelName => {
    const { existsInServer, plural } = models[modelName];
    if (!existsInServer) return;
    const typeStr = relay
      ? `${upperFirst(modelName)}Connection`
      : `[${upperFirst(modelName)}]`;
    querySpecs.push(`  ${plural}: ${typeStr}\n`);
  });
  if (relay) {
    querySpecs.unshift(
      '  node(\n' +
        '    # The ID of an object\n' +
        '    id: ID!\n' +
        '  ): Node\n',
    );
  }
  let out = `# Root query\ntype Query {\n${querySpecs.join('')}}\n\n`;
  if (relay) out += writeRelayConnections(models);
  return out;
};

const writeType = (models, modelName, options) => {
  const { description, fields, relations } = models[modelName];
  const upperModelName = upperFirst(modelName);
  const implementsStr = options.relay ? ' implements Node' : '';
  let allSpecs = [];
  Object.keys(fields).forEach(fieldName => {
    if (!fields[fieldName].existsInServer) return;
    allSpecs = allSpecs.concat(
      writeField(fieldName, fields[fieldName], options),
    );
  });
  Object.keys(relations).forEach(fieldName => {
    allSpecs = allSpecs.concat(
      writeField(fieldName, relations[fieldName], options),
    );
  });
  const contents = allSpecs.length ? `\n  ${allSpecs.join('\n  ')}\n` : '';
  let comment = `# ${upperModelName}`;
  if (description) comment += `: ${description}`;
  return `${comment}\ntype ${upperModelName}${implementsStr} {${contents}}\n\n`;
};

// input CompanyUpdateInput {
//   id: ID!  // remove this for creates
//   ...all company fields as optional
//   ...Id fields for (direct-only) relations
//   storyId: String  // for use with Storyboard (behind a flag)
//   clientMutationId: String
// }
//
// type CompanyUpdatePayload {
//   company: Company
//   clientMutationId: String
// }
const writeMutationTypes = (models, modelName, op, options) => {
  let out = '';
  const upperModelName = upperFirst(modelName);
  const upperOp = upperFirst(op);
  const { fields, relations } = models[modelName];
  let contents = [];
  Object.keys(fields).forEach(fieldName => {
    if (fieldName === 'id' && op === 'create') return;
    if (!fields[fieldName].existsInServer) return;
    const spec = omit(
      fields[fieldName],
      op === 'create' ? ['description'] : ['description', 'isRequired'],
    );
    contents = contents.concat(writeField(fieldName, spec, options));
  });
  Object.keys(relations).forEach(fieldName => {
    const spec = relations[fieldName];
    if (spec.isInverse || spec.isPlural) return;
    const isRequired = op === 'create' && spec.isRequired;
    contents.push(
      `${spec.fkName}: ID${isRequired ? '!' : ''}`,
    );
  });
  if (options.storyboard) contents.push('storyId: String');
  out +=
    `input ${upperModelName}${upperOp}Input {\n` +
    contents.map(o => `  ${o}\n`).join('') +
    '  clientMutationId: String\n' +
    '}\n\n';
  out +=
    `type ${upperModelName}${upperOp}Payload {\n` +
    `  ${modelName}: ${upperModelName}\n` +
    '  clientMutationId: String\n' +
    '}\n\n';
  return out;
};

const writeField = (name, specs: any, options) => {
  const typeStr = writeFieldType(specs, options);
  const out = [];
  if (specs.description) out.push(`# ${specs.description}`);
  out.push(`${name}: ${typeStr}`);
  return out;
};

const writeFieldType = (specs, options) => {
  const { type, model, isPrimaryKey, isRequired, isPlural } = specs;
  let out;
  if (isPrimaryKey) out = 'ID';
  else if (model) out = upperFirst(model);
  else if (type === 'boolean') out = 'Boolean';
  else if (type === 'number') out = specs.isFloat ? 'Float' : 'Int';
  else out = 'String';
  if (isPlural) {
    out = options.relay ? `${out}Connection` : `[${out}]`;
  }
  if (isPrimaryKey || isRequired) out += '!';
  return out;
};

const writeRelayConnections = models => {
  let out = '';
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
    const upperModelName = upperFirst(modelName);
    out +=
      `type ${upperModelName}Connection {\n` +
      '  pageInfo: PageInfo!\n' +
      `  edges: [${upperModelName}Edge]\n` +
      '}\n\n' +
      `type ${upperModelName}Edge {\n` +
      `  node: ${upperModelName}\n` +
      '  cursor: String!\n' +
      '}\n\n';
  });
  return out;
};

const writeRootMutation = models => {
  const contents = [];
  Object.keys(models).forEach(modelName => {
    if (!models[modelName].existsInServer) return;
    const name = upperFirst(modelName);
    contents.push(
      `create${name}(input: Create${name}Input!): Create${name}Payload`,
    );
    contents.push(
      `update${name}(input: Update${name}Input!): Update${name}Payload`,
    );
  });
  return 'type Mutation {\n' + contents.map(o => `  ${o}\n`).join('') + '}\n\n';
};

// ====================================
// Public
// ====================================
export { output };
