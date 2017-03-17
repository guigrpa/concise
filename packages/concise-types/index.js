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
export type FieldType = 'string' | 'boolean' | 'uuid' | 'json' | 'number' | 'date';
export type Field =
| (FieldBase & { type: 'string', long?: boolean, default?: string })
| (FieldBase & { type: 'boolean', default?: boolean })
| (FieldBase & { type: 'uuid', default?: string })
| (FieldBase & { type: 'json', default?: any })
| (FieldBase & { type: 'number', float?: boolean, default?: number })
| (FieldBase & { type: 'date', noDate?: boolean, noTime?: boolean, default?: Object })
;
export type FieldBase = {
  primaryKey?: boolean,
  description?: Description,
  validations: FieldValidations,
};
export type FieldValidations = {
  required?: boolean,
  // TBW...
};

// Relations are defined exactly as fields, and only on the side having the FK
// (the inverse relation can be canceled specifying `null` in the `inverse` field,
// or configured as needed).
// The relation's name is the field name minus `Id`. Several options can be defined
export type Relation = {
  description?: Description,
  validations: FieldValidations,
  model: ModelName,

  // By default, the reverse relation will be defined; use `null` to indicate otherwise
  inverse?: null | {
    description?: Description,
    name?: FieldName,
    singular?: boolean, // by default, plural
  },
  polymorphic?: {
    targets: Array<ModelName>,
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
export type OutputProcessor = (schema: Schema, options: Object) => Promise<any>;
