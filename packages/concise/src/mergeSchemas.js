// @flow

import { merge, omit, set as timmSet } from 'timm';
import type { Schema } from 'concise-types';

const mergeSchemas = (a: Schema, b: Schema): Schema => {
  let out = a;

  // Non-model specs are merged from `b`
  out = merge(out, omit(b, ['models']));

  // Merge models
  let models = out.models;
  Object.keys(b.models).forEach((modelName) => {
    let model = models[modelName];
    const bModel: Object = b.models[modelName];

    // Models from b that didn't exist in a
    if (!model) {
      models = timmSet(models, modelName, bModel);
      return;
    }

    // Preexisting models
    const { description, includes, fields, relations } = bModel;
    model = merge(model, {
      description,
      includes: includes ? merge(model.includes || {}, includes) : undefined,
      fields: fields ? merge(model.fields || {}, fields) : undefined,
      relations: relations
        ? merge(model.relations || {}, relations)
        : undefined,
    });
    models = timmSet(models, modelName, model);
  });
  out = timmSet(out, 'models', models);

  return out;
};

export default mergeSchemas;
