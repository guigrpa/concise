// @flow

import { clone, merge, set as timmSet, setIn } from 'timm';
import type { Schema, ProcessedSchema, MapOf, ModelName } from 'concise-types';
import { pluralize } from 'inflection';

const preprocess = (schema: Schema): ProcessedSchema => {
  const models = {};

  // Process includes
  Object.keys(schema.models).forEach(modelName => {
    const model0 = schema.models[modelName];
    if (model0.includeOnly) return;
    let model: Object = clone(model0);
    const includes: MapOf<ModelName, boolean> = model.includes != null ? model.includes : {};
    Object.keys(includes).forEach(includeName => {
      if (!includes[includeName]) return;
      const include = schema.models[includeName];
      if (!include) {
        throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
      }
      const { fields, relations } = include;
      model = merge(model, {
        fields: merge({}, fields, model.fields),
        relations: merge({}, relations, model.relations),
      });
    });
    delete model.includes;
    models[modelName] = model;
  });

  // Process relation field types
  Object.keys(models).forEach(modelName => {
    let { relations = {} } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      // Relation shorthand
      if (relations[relationName] === true) {
        relations = timmSet(relations, relationName, {});
      }
      // Relation model
      if (relations[relationName].model == null) {
        relations = setIn(relations, [relationName, 'model'], relationName);
      }
      const relatedModelName = relations[relationName].model;
      // Relation type
      const relatedModel = models[relatedModelName];
      if (!relatedModel) {
        throw new Error(
          `RELATED_MODEL_NOT_FOUND ${modelName}/${relationName}/${relatedModelName}`,
        );
      }
      const idField = relatedModel.fields && relatedModel.fields.id;
      if (!idField) {
        throw new Error(
          `ID_FIELD_NOT_FOUND ${modelName}/${relationName}/${relatedModelName}`,
        );
      }
      relations = setIn(relations, [relationName, 'type'], idField.type);
      // Inverse shorthand
      if (relations[relationName].inverse == null) {
        relations = setIn(relations, [relationName, 'inverse'], {});
      }
      // Inverse singular
      if (relations[relationName].inverse !== false) {
        if (relations[relationName].inverse.singular == null) {
          relations = setIn(relations, [relationName, 'inverse', 'singular'], false);
        }
        const { singular } = relations[relationName].inverse;
        if (relations[relationName].inverse.name == null) {
          const inverseName = singular ? modelName : pluralize(modelName);
          relations = setIn(relations, [relationName, 'inverse', 'name'], inverseName);
        }
      }
    });
    models[modelName] = timmSet(models[modelName], 'relations', relations);
  });

  return { models };
};

export default preprocess;
