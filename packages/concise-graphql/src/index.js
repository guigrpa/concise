// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import type { Schema, OutputProcessor, SchemaUtils } from 'concise-types';
import upperFirst from 'lodash.upperfirst';

/* --
Output-only.

Output options:
* `relay?` (`boolean` = `false`): include `Node` interface
  and `node` root field, define connections, etc.
-- */
type OutputOptions = {
  file?: string,
  relay?: boolean,
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
  const raw = writeTypes(preprocessedSchema, options);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// GraphQL writer
// ====================================
const writeTypes = ({ models }, options) => {
  let out = '';
  const relay = options.relay;
  if (relay) {
    out +=
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
  }
  Object.keys(models).forEach(modelName => {
    out += writeType(models, modelName, options);
  });
  const querySpecs = Object.keys(models).map(modelName => {
    const { plural } = models[modelName];
    const typeStr = relay
      ? `${upperFirst(modelName)}Connection`
      : `[${upperFirst(modelName)}]`;
    return `  ${plural}: ${typeStr}\n`;
  });
  if (relay) querySpecs.unshift('  node: Node\n')
  out += (
    '# Root query\n' +
    'type Query {\n' +
    querySpecs.join('') +
    '}\n\n'
  );
  if (relay) out += writeRelayConnections(models);
  return out;
};

const writeType = (models, modelName, options) => {
  const { description, fields = {}, relations = {} } = models[modelName];
  const upperModelName: string = upperFirst(modelName);
  const implementsStr = options.relay ? ' implements Node' : '';
  let allSpecs = [];
  Object.keys(fields).forEach(fieldName => {
    allSpecs = allSpecs.concat(writeField(fieldName, fields[fieldName], options));
  });
  Object.keys(relations).forEach(fieldName => {
    allSpecs = allSpecs.concat(writeField(fieldName, relations[fieldName], options));
  });
  const contents = allSpecs.length ? `\n  ${allSpecs.join('\n  ')}\n` : '';
  let comment = `# ${upperModelName}`;
  if (description) comment += `: ${description}`;
  return (
    `${comment}\n` +
    `type ${upperModelName}${implementsStr} {${contents}}\n\n`
  );
};

const writeField = (name, specs: any, options) => {
  const typeStr = writeFieldType(specs, options);
  const out = [];
  if (specs.description) out.push(`# ${specs.description}`);
  out.push(`${name}: ${typeStr}`);
  return out;
};

const writeFieldType = (specs, options) => {
  const { type, model, isPrimaryKey, validations, isPlural } = specs;
  let out;
  if (isPrimaryKey) out = 'ID';
  else if (model) out = upperFirst(model);
  else if (type === 'boolean') out = 'Boolean';
  else if (type === 'number') out = specs.isFloat ? 'Float' : 'Int';
  else out = 'String';
  if (isPlural) {
    out = options.relay ? `${out}Connection` : `[${out}]`;
  }
  if (isPrimaryKey || (validations && validations.isRequired)) out += '!';
  return out;
};

const writeRelayConnections = models => {
  let out = '';
  const keys = {};
  Object.keys(models).forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      const relation = relations[relationName];
      if (!relation.isPlural || keys[relation.model]) return;
      keys[relation.model] = true;
      const upperModelName: string = upperFirst(relation.model);
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
  });
  return out;
};

/*
Ideas for mutations (check Relay Modern docs):

input CompanyUpdateInput {
  id: ID!  // remove this for creates
  ...all company fields as optional
  ...Id fields for (direct-only) relations
  storyId: String  // for use with Storyboard (behind a flag)
  clientMutationId: String
}

type CompanyUpdatePayload {
  company: Company
  clientMutationId: String
}
*/

// ====================================
// Public
// ====================================
export { output };
