// @flow

export type Schema = {
  models: { [key: ModelName]: Model },

  // some additional specs maybe (e.g. the name and type of the `id` field?)
};

// ====================================
// Model
// ====================================
export type ModelName = string;
export type Model = {
  description?: Description,
  includes: { [key: ModelName]: boolean },
  fields: { [key: FieldName]: Field },
  relations: { [key: FieldName]: Relation },

  // Only to be used as part of other models
  includeOnly?: boolean,
};

export type FieldName = string;
export type FieldType =
  | 'string'
  | 'boolean'
  | 'uuid'
  | 'json'
  | 'number'
  | 'date';
export type Field =
  | (FieldBase & { type: 'string', long?: boolean, defaultValue?: string })
  | (FieldBase & { type: 'boolean', defaultValue?: boolean })
  | (FieldBase & { type: 'uuid', defaultValue?: string })
  | (FieldBase & { type: 'json', defaultValue?: any })
  | (FieldBase & { type: 'number', float?: boolean, defaultValue?: number })
  | (FieldBase & {
    type: 'date',
    noDate?: boolean,
    noTime?: boolean,
    defaultValue?: Date,
  });
export type FieldBase = {
  primaryKey?: boolean,
  description?: Description,
  validations: FieldValidations,
};
export type FieldValidations = {
  required?: boolean,
  unique?: boolean,
  // TBW...
};

// Relations are defined whenever a FK should appear. The FK field will have the name
// of the relation + `Id`, and the type of the referenced PK (hence, no `type` should
// be specified).
// Inverse relations (useful in many cases to define the way to traverse a 1 -> N relationship)
// are created by default. Specify `inverse` if you want to disable the inverse
// relation (`inverse: null`) or you want to configure some of its parameters
export type Relation = {
  description?: Description,
  validations: FieldValidations,
  model: ModelName,
  // By default, the reverse relation will be defined; use `null` to indicate otherwise
  inverse?:
    | null
    | {
        name?: FieldName,
        description?: Description,
        singular?: boolean, // by default, plural
      },
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
  preprocess: (schema: Schema) => Schema,
};
