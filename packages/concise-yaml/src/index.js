// @flow

import fs from 'fs';
import yaml from 'js-yaml';
import type { Schema, InputProcessor, OutputProcessor } from 'concise-types';

type InputOptions = {
  file?: string,
  raw?: string,
};

type OutputOptions = {
  file?: string,
};

// ====================================
// Processors
// ====================================
const input: InputProcessor = async (options: InputOptions) => {
  let raw: string;
  if (options.raw) {
    raw = options.raw;
  } else if (options.file) {
    raw = fs.readFileSync(options.file, 'utf8');
  } else {
    throw new Error('Specify either `raw` or `file`');
  }
  return yaml.safeLoad(raw);
};

const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions,
) => {
  const raw = yaml.safeDump(schema);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// Public
// ====================================
export { input, output };
