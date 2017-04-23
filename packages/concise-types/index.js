// @flow

export type MapOf<A, B> = { [key: A]: B };

// User-provided schema
export type Schema = {
  models: MapOf<ModelName, Model>,
  // can have additional specs
};

// Preprocessed schema (required by some plugins)
export type ProcessedSchema = {
  models: MapOf<ModelName, ProcessedModel>,
};

// ====================================
// Model
// ====================================
export type ModelName = string;

export type Model = {
  description?: Description,
  fields?: MapOf<FieldName, Field>,
  relations?: MapOf<FieldName, Relation>,

  // Include other models in this one
  includes?: MapOf<ModelName, true>,
  // This model is only for inclusion in other models
  isIncludeOnly?: boolean,
};

export type ProcessedModel = {
  singular: string,
  plural: string,
  description?: Description,
  fields: MapOf<FieldName, ProcessedField>,
  relations: MapOf<FieldName, ProcessedRelation>,
};

// ====================================
// Field
// ====================================
export type FieldName = string;

export type FieldType =
  | 'string'
  | 'boolean'
  | 'uuid'
  | 'json'
  | 'number'
  | 'date';

export type Field =
  | { ...FieldBase, type: 'string', isLong?: boolean, defaultValue?: string }
  | { ...FieldBase, type: 'boolean', defaultValue?: boolean }
  | { ...FieldBase, type: 'uuid', defaultValue?: string }
  | { ...FieldBase, type: 'json', defaultValue?: any }
  | { ...FieldBase, type: 'number', isFloat?: boolean, defaultValue?: number }
  | {
    ...FieldBase,
    type: 'date',
    noDate?: boolean,
    noTime?: boolean,
    defaultValue?: Date,
  };

export type FieldBase = {
  isPrimaryKey?: boolean,
  isAutoIncrement?: boolean,
  description?: Description,
  validations?: FieldValidations,
};

export type FieldValidations = {
  isRequired?: boolean,
  isUnique?: boolean,
  // TBW...
};

export type ProcessedField = Field;

// ====================================
// Relation
// ====================================
// Relations are defined whenever a FK should appear. The FK field will have the name
// of the relation + `Id`, and the type of the referenced PK (hence, no `type` should
// be specified).
// Inverse relations (useful in many cases to define the way to traverse a 1 -> N relationship)
// are created by default. Specify `inverse` if you want to disable the inverse
// relation (`inverse: null`) or you want to configure some of its parameters
export type Relation =
  | true
  | {
      description?: Description,
      validations?: FieldValidations,
      model?: ModelName, // default: relation name
      isPlural?: boolean, // default: false
      fkName?: string,
      inverse?:  // default: true
        | boolean
        | {
            description?: Description,
            isPlural?: boolean, // default: true
            name?: FieldName, // default: inferred from model name + isPlural field
          },
    };

export type ProcessedRelation = {
  description?: Description,
  validations?: FieldValidations,
  type: FieldType,
  model: ModelName,
  isPlural: boolean,
  fkName: string,
  isInverse: boolean,
  inverseName: ?FieldName,
};

// ====================================
// Helper types
// ====================================
type Description = string;

// ====================================
// Processors
// ====================================
export type InputProcessor = (options: Object) => Promise<Schema>;
export type OutputProcessor = (
  schema: Schema,
  options: Object,
  utils: SchemaUtils,
) => Promise<any>;

export type SchemaUtils = {
  preprocess: (schema: Schema) => ProcessedSchema,
};
