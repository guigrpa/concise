// @flow

/* eslint-disable no-param-reassign */

import { clone, addDefaults, merge, omit } from 'timm';
import cloneDeep from 'lodash.clonedeep';
import type { Schema, ProcessedSchema } from 'concise-types';
import { singularize, pluralize } from 'inflection';

const preprocess = (schema0: Schema): ProcessedSchema => {
  const schema = addDefaults(cloneDeep(schema0), {
    models: {},
    authRules: [],
  });
  addModelDefaults(schema.models);
  processIncludes(schema.models);
  addFieldDefaults(schema.models);
  processRelations(schema.models);
  return schema;
};

const addModelDefaults = models => {
  Object.keys(models).forEach(modelName => {
    models[modelName] = addDefaults(models[modelName], {
      fields: {},
      relations: {},
      singular: modelName,
      plural: pluralize(modelName),
      existsInServer: true,
      existsInClient: true,
    });
  });
};

const processIncludes = models => {
  // Extract includes
  const includes = {};
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    if (model.isIncludeOnly) {
      includes[modelName] = model;
      delete models[modelName];
    }
  });

  // Apply includes
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    const modelIncludes = model.includes != null ? model.includes : {};
    Object.keys(modelIncludes).forEach(includeName => {
      const include = includes[includeName];
      if (!include) {
        throw new Error(`INCLUDE_NOT_FOUND ${modelName}/${includeName}`);
      }
      model.fields = merge(cloneDeep(include.fields), model.fields);
      model.relations = merge(cloneDeep(include.relations), model.relations);
    });
    delete model.includes;
  });
};

const addFieldDefaults = models => {
  Object.keys(models).forEach(modelName => {
    const { fields } = models[modelName];
    Object.keys(fields).forEach(fieldName => {
      fields[fieldName] = addDefaults(fields[fieldName], {
        existsInServer: true,
        existsInClient: true,
      });
    });
  });
};

const processRelations = models => {
  Object.keys(models).forEach(modelName => {
    const { relations } = models[modelName];
    Object.keys(relations).forEach(relationName => {
      // Relation shorthand
      let relation = relations[relationName];
      if (relation === true) relation = {};
      if (relation.isInverse) return;
      // Relation defaults
      const { isPlural = false } = relation;
      const fkName = getFkName(relationName, isPlural);
      relation = addDefaults(relation, {
        model: isPlural ? singularize(relationName) : relationName,
        fkName,
        isPlural: false,
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
// Helpers
// ====================================
const getFkName = (relationName, isPlural) => {
  const base = isPlural ? singularize(relationName) : relationName;
  return `${base}${isPlural ? 'Ids' : 'Id'}`;
};

// ====================================
// Public
// ====================================
export default preprocess;
