// @flow

import fs from 'fs';
import type { Schema, InputProcessor, OutputProcessor } from 'concise-types';

/* --
Input/output.

Output options:
* `file?` (`string`): if specified, output will be written to the specified path
* `prettyJson?` (`boolean` = `false`): prettify JSON output
-- */
type InputOptions = {
  file?: string,
  raw?: string,
};

type OutputOptions = {
  prettyJson?: boolean,
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
  return JSON.parse(raw);
};

const output: OutputProcessor = async (
  schema: Schema,
  options: OutputOptions
) => {
  const { prettyJson = true } = options;
  const raw = prettyJson
    ? JSON.stringify(schema, null, 2)
    : JSON.stringify(schema);
  if (options.file) fs.writeFileSync(options.file, raw, 'utf8');
  return raw;
};

// ====================================
// Public
// ====================================
export { input, output };
