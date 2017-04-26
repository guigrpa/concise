// @flow

import { clone, addDefaults, merge, omit } from 'timm';
import type { Schema, ProcessedSchema } from 'concise-types';
import { singularize, pluralize } from 'inflection';

const preprocess = (schema: Schema): ProcessedSchema => {
  const out: Object = {};
  out.models = {};
  out.authRules = [];
  Object.keys(schema).forEach(key => {
    let val;
    if (key === 'models') {
      val = processModels(schema.models);
    } else {
      val = schema[key];
    }
    out[key] = val;
  });
  return out;
};

const processModels = prevModels => {
  const nextModels = processIncludesAndAddFieldDefaults(prevModels);
  processRelations(nextModels);
  return nextModels;
};

const processIncludesAndAddFieldDefaults = prevModels => {
  const nextModels = {};
  Object.keys(prevModels).forEach(modelName => {
    const prevModel = prevModels[modelName];
    if (prevModel.isIncludeOnly) return;
    const nextModel = processIncludesInModel(prevModel, prevModels, modelName);
    addFieldDefaults(nextModel);
    nextModels[modelName] = nextModel;
  });
  return nextModels;
};

const processIncludesInModel = (model, models, modelName) => {
  const out = merge(
    {
      existsInServer: true,
      existsInClient: true,
      singular: modelName,
      plural: pluralize(modelName),
    },
    model,
  );
  out.fields = merge({}, model.fields);
  out.relations = merge({}, model.relations);
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

const addFieldDefaults = model => {
  const { fields } = model;
  Object.keys(fields).forEach(fieldName => {
    fields[fieldName] = addDefaults(fields[fieldName], {
      existsInServer: true,
      existsInClient: true,
    });
  });
};

const getFkName = (relationName, isPlural) => {
  const base = isPlural ? singularize(relationName) : relationName;
  return `${base}${isPlural ? 'Ids' : 'Id'}`;
};

// In-place (down to `relations` level, which has already been re-created by processIncludes())
const processRelations = models => {
  Object.keys(models).forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      // Relation shorthand
      let relation = relations[relationName] === true
        ? {}
        : clone(relations[relationName]);
      if (relation.isInverse) return;
      // Relation defaults
      const fkName = getFkName(
        relationName,
        relation.isPlural != null ? relation.isPlural : false,
      );
      relation = addDefaults(relation, {
        model: relationName,
        fkName,
        isPlural: false,
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
      relation.type = idField.type;

      // Create inverse relation, if needed
      const { inverse } = relation;
      if (inverse !== false) {
        let inverseRelation = inverse == null || inverse === true
          ? {} // inverse shorthand
          : omit(clone(inverse), ['name']);
        inverseRelation = addDefaults(inverseRelation, {
          model: modelName,
          isPlural: true,
          validations: {},
          isInverse: true,
          inverseName: relationName,
        });
        const idField2 = models[modelName].fields.id;
        inverseRelation.type = idField2 ? idField2.type : undefined;
        const { isPlural } = inverseRelation;
        const inverseName =
          (inverse && inverse.name) ||
          (isPlural ? pluralize(modelName) : modelName);
        const inverseFkName = getFkName(
          inverseName,
          inverseRelation.isPlural != null ? inverseRelation.isPlural : true,
        );
        inverseRelation.fkName = inverseFkName;
        relatedModel.relations[inverseName] = inverseRelation;
        relation.inverseName = inverseName;
      }
      if (relation.inverseName === undefined) relation.inverseName = null;
      delete relation.inverse;
      relations[relationName] = relation;
    });
  });
};

// ====================================
// Public
// ====================================
export default preprocess;
