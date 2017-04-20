// @flow

import { addDefaults, merge, omit, set as timmSet, setIn } from 'timm';
import type { Schema, ProcessedSchema } from 'concise-types';
import { singularize, pluralize } from 'inflection';

const preprocess = (schema: Schema): ProcessedSchema => {
  const out: Object = {};
  Object.keys(schema).forEach(key => {
    let val = schema[key];
    if (key === 'models') val = processModels(val);
    out[key] = val;
  });
  return out;
};

const processModels = models => {
  let out = models;
  out = processIncludes(out);
  processRelations(out);
  return out;
};

const processIncludes = models => {
  const out = {};
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    if (model.includeOnly) return;
    out[modelName] = processIncludesInModel(model, models, modelName);
  });
  return out;
};

const processIncludesInModel = (model, models, modelName) => {
  const out = merge(
    {
      fields: {},
      relations: {},
    },
    model,
  );
  const includes: any = out.includes != null ? out.includes : {};
  Object.keys(includes).forEach(includeName => {
    const include = models[includeName];
    if (!include) {
      throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
    }
    const { fields, relations } = include;
    out.fields = merge({}, fields, out.fields);
    out.relations = merge({}, relations, out.relations);
  });
  delete out.includes;
  return out;
};

const getFkName = (relationName, plural) => {
  const base = plural ? singularize(relationName) : relationName;
  return `${base}${plural ? 'Ids' : 'Id'}`;
};

// In-place (down to `relations` level, which has already been re-created by processIncludes())
const processRelations = models => {
  Object.keys(models).forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      // Relation shorthand
      if (relations[relationName] === true) relations[relationName] = {};
      let relation = relations[relationName];
      if (relation.isInverse) return;
      // Relation defaults
      const fkName = getFkName(
        relationName,
        relation.plural != null ? relation.plural : false,
      );
      relation = addDefaults(relation, {
        model: relationName,
        fkName,
        plural: false,
        validations: {},
        isInverse: false,
      });
      const relatedModelName = relation.model;
      // Relation type
      const relatedModel = models[relatedModelName];
      if (!relatedModel) {
        throw new Error(
          `RELATED_MODEL_NOT_FOUND ${modelName}/${relationName}/${relatedModelName}`,
        );
      }
      const idField = relatedModel.fields.id;
      if (!idField) {
        throw new Error(
          `ID_FIELD_NOT_FOUND ${modelName}/${relationName}/${relatedModelName}`,
        );
      }
      relation = timmSet(relation, 'type', idField.type);

      // Create inverse relation, if needed
      const { inverse } = relation;
      if (inverse !== false) {
        let inverseRelation = inverse == null || inverse === true
          ? {} // inverse shorthand
          : omit(inverse, ['name']);
        inverseRelation = addDefaults(inverseRelation, {
          model: modelName,
          plural: true,
          validations: {},
          isInverse: true,
        });
        const idField2 = models[modelName].fields.id;
        if (!idField2) throw new Error(`ID_FIELD_NOT_FOUND ${modelName}`);
        inverseRelation = timmSet(inverseRelation, 'type', idField2.type);
        const { plural } = inverseRelation;
        const inverseName =
          (inverse && inverse.name) ||
          (plural ? pluralize(modelName) : modelName);
        const inverseFkName = getFkName(
          inverseName,
          inverseRelation.plural != null ? inverseRelation.plural : true,
        );
        inverseRelation = timmSet(inverseRelation, 'fkName', inverseFkName);
        relatedModel.relations[inverseName] = inverseRelation;
      }
      relations[relationName] = omit(relation, ['inverse']);
    });
  });
};

// ====================================
// Public
// ====================================
export default preprocess;
