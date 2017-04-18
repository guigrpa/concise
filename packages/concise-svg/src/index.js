// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import Viz from 'viz.js';
import { addDefaults } from 'timm';
import type {
  Schema,
  OutputProcessor,
  SchemaUtils,
  ModelName,
  FieldName,
} from 'concise-types';

type OutputOptions = {
  file?: string,
  filterEdges?: (
    { from: ModelName, to: ModelName, as: FieldName, required: boolean },
  ) => boolean,
  edgeLabels?: boolean,
};

const DEFAULT_OPTIONS = {
  edgeLabels: true,
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
  const vizInput = writeDiagram(
    preprocessedSchema,
    addDefaults(options, DEFAULT_OPTIONS),
  );
  const svg = Viz(vizInput);
  if (options.file) {
    fs.writeFileSync(options.file, svg, 'utf8');
  }
  return svg;
};

// ====================================
// Flow writer
// ====================================
const writeDiagram = ({ models }, { filterEdges, edgeLabels }) => {
  // Object.keys(models).forEach(modelName => {
  //   out += writeType(models, modelName);
  // });
  const modelNames = Object.keys(models);
  const nodes = [];
  modelNames.forEach(modelName => {
    // const spec = models[modelName];
    // const fieldNames = ['id'].concat(Object.keys(spec.relations || {})).map(o => `<${o}> ${o}`);
    // nodes.push(`${modelName} [label="{${modelName} | ${fieldNames.join('|')}}"]`);
    nodes.push(modelName);
  });
  const edges = [];
  modelNames.forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations || {}).forEach(fieldName => {
      const specs = relations[fieldName];
      const required = specs.validations && specs.validations.required === true;
      if (
        filterEdges &&
        !filterEdges({
          from: modelName,
          to: specs.model,
          as: fieldName,
          required,
        })
      ) {
        return;
      }
      // let edge = `${modelName}:${fieldName} -> ${specs.model}:id [label="${fieldName}"]`;
      const edgeLabel = edgeLabels && fieldName !== specs.model
        ? ` [label="${fieldName}"]`
        : '';
      let edge = `${modelName} -> ${specs.model}${edgeLabel}`;
      if (!required) edge += ' [style=dotted]';
      edges.push(edge);
    });
  });
  return 'digraph {\n' +
    '  node [shape=box];\n' +
    nodes.map(o => `  ${o};\n`).join('') +
    edges.map(o => `  ${o};\n`).join('') +
    '}\n';
};

// ====================================
// Public
// ====================================
export { output };
