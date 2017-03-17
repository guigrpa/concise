// @flow

import type { Schema, InputProcessor, OutputProcessor } from 'concise-types';
import mergeSchemas from './mergeSchemas';

class Concise {
  schema: Schema;

  constructor() {
    this.schema = {
      models: {},
    };
  }

  async input(processor: InputProcessor, options: Object = {}) {
    const schema = await processor(options);
    this.addSchema(schema);
    return this.schema;
  }

  addSchema(schema: Schema) {
    // TODO: validate?
    this.schema = mergeSchemas(this.schema, schema);
  }

  getSchema() {
    return this.schema;
  }

  async output(processor: OutputProcessor, options: Object = {}) {
    return processor(this.schema, options);
  }
}

export default Concise;
