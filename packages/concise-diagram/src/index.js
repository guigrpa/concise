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
  const modelNames = Object.keys(models);
  const nodes = modelNames.map(modelName => {
    let node = modelName;
    const { description } = models[modelName];
    const props = [];
    if (description) {
      props.push(`comment="${description}"`);
      props.push(`tooltip="${description}"`);
    }
    if (props.length) node += ` [${props.join(', ')}]`;
    return node;
  });
  const edges = [];
  modelNames.forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(fieldName => {
      const specs = relations[fieldName];
      if (specs.isInverse) return;
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
      const props = [];
      if (edgeLabels && fieldName !== specs.model) {
        props.push(`label=${fieldName}`);
      }
      if (!required) props.push('style=dotted');
      let edge = `${modelName} -> ${specs.model}`;
      if (props.length) edge += ` [${props.join(', ')}]`;
      edges.push(edge);
    });
  });
  return 'digraph "" {\n' +  // `""` removes the background tooltip
    '  node [shape=box, fontname="sans-serif"];\n' +
    '  edge [fontsize=9, fontname="sans-serif"];\n' +
    nodes.map(o => `  ${o};\n`).join('') +
    edges.map(o => `  ${o};\n`).join('') +
    '}\n';
};

// ====================================
// Public
// ====================================
export { output };
