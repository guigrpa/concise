// @flow

import { clone, merge, set as timmSet, setIn } from 'timm';
import type { Schema } from 'concise-types';

const preprocess = (schema: Schema): Schema => {
  const models = {};

  // Process includes
  Object.keys(schema.models).forEach(modelName => {
    const model0 = schema.models[modelName];
    if (model0.includeOnly) return;
    let model = clone(model0);
    if (model.includes) {
      Object.keys(model.includes).forEach(includeName => {
        const include = schema.models[includeName];
        if (!include) throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
        const { fields, relations } = include;
        model = merge(model, {
          fields: fields ? merge(fields, model.fields) : undefined,
          relations: relations ? merge(relations, model.relations) : undefined,
        });
      });
    }
    delete model.includes;
    models[modelName] = model;
  });

  // Process relation field types
  Object.keys(models).forEach(modelName => {
    let { relations } = models[modelName];
    Object.keys(relations || {}).forEach(relationName => {
      if (relations[relationName] === true) {
        relations = timmSet(relations, relationName, { model: relationName });
      }
      if (relations[relationName].model == null) {
        relations = setIn(relations, [relationName, 'model'], relationName);
      }
      const relation = relations[relationName];
      const relatedModel = models[relation.model];
      if (!relatedModel) {
        throw new Error(`RELATED_MODEL_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      const idField = relatedModel && relatedModel.fields && relatedModel.fields.id;
      if (!idField) {
        throw new Error(`ID_FIELD_NOT_FOUND ${modelName}/${relationName}/${relation.model}`);
      }
      relations = setIn(relations, [relationName, 'type'], idField.type);
    });
    models[modelName] = timmSet(models[modelName], 'relations', relations);
  });

  return { models };
};

export default preprocess;
