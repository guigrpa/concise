// @flow

/* eslint-disable prefer-template */

import fs from 'fs';
import Viz from 'viz.js';
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
  const vizInput = writeDiagram(preprocessedSchema, options);
  const svg = Viz(vizInput);
  if (options.file) {
    fs.writeFileSync(options.file, svg, 'utf8');
  }
  return svg;
};

// ====================================
// Flow writer
// ====================================
const writeDiagram = ({ models }, { filterEdges }) => {
  // Object.keys(models).forEach(modelName => {
  //   out += writeType(models, modelName);
  // });
  const modelNames = Object.keys(models);
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
      let edge = `${modelName} -> ${specs.model}`;
      if (!required) edge += ' [style=dotted]';
      edges.push(edge);
    });
  });
  return 'digraph {\n' +
    '  node [shape=box];\n' +
    modelNames.map(o => `  ${o};\n`).join('') +
    edges.map(o => `  ${o};\n`).join('') +
    '}\n';
};

// ====================================
// Public
// ====================================
export { output };
