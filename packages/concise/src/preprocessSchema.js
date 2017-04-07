// @flow

import { omit, merge, setIn } from 'timm';
import type { Schema } from 'concise-types';

const preprocess = (schema: Schema): Schema => {
  const models = {};

  // Process includes
  Object.keys(schema.models).forEach(modelName => {
    let model = schema.models[modelName];
    if (model.includeOnly) return;
    if (model.includes) {
      Object.keys(model.includes).forEach(includeName => {
        const include = schema.models[includeName];
        if (!include) throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
        const { fields, relations } = include;
        model = merge(omit(model, ['includes']), {
          fields: fields ? merge(fields, model.fields) : undefined,
          relations: relations ? merge(relations, model.relations) : undefined,
        });
      });
    }
    models[modelName] = model;
  });

  // Process relation field types
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    Object.keys(model.relations || {}).forEach(relationName => {
      const relation = model.relations[relationName];
      const relatedModel = models[relation.model];
      if (!relatedModel) {
        throw new Error(`RELATED_MODEL_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      const idField = relatedModel && relatedModel.fields && relatedModel.fields.id;
      if (!idField) {
        throw new Error(`ID_FIELD_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      models[modelName] = setIn(
        models[modelName],
        ['relations', relationName, 'type'],
        idField.type
      );
    });
  });

  return { models };
};

export default preprocess;
