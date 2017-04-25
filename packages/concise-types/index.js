// @flow

export type MapOf<A, B> = { [key: A]: B };

// User-provided schema
export type Schema = {
  models: MapOf<ModelName, Model>,
  authRules?: Array<AuthRule>,
  // can have additional specs
};

// Preprocessed schema (required by some plugins)
export type ProcessedSchema = {
  models: MapOf<ModelName, ProcessedModel>,
  authRules: Array<AuthRule>,
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
  description?: Description,
  validations?: Validations,
  existsInServer?: boolean, // default: true
  existsInClient?: boolean, // default: true
  isPrimaryKey?: boolean,
  isAutoIncremented?: boolean,
};

export type Validations = {
  // Generic
  isRequired?: boolean,
  isUnique?: boolean,
  isOneOf?: Array<any>,
  // Strings
  hasAtLeastChars?: number,
  hasAtMostChars?: number,
  hasLengthWithinRange?: [number, number], // min, max
  isEmail?: boolean,
  isUrl?: boolean,
  isIp?: boolean, // v4/v6
  isCreditCard?: boolean,
  matchesPattern?: [string, string], // pattern, modifiers
  // Numbers
  isGte?: number,
  isLte?: number,
  isWithinRange?: [number, number], // min, max
  // Custom, e.g. `val => { if (val === 3) throw new Error('Val must be 3!'); }`
  satisfies?: string, // SECURITY NOTICE: HANDLE CAREFULLY
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
      validations?: Validations,
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
      // Disable referential integrity in Sequelize?
      // Needed due to Sequelize limitation, which cannot handle two tables
      // with FKs to one other
      // See http://docs.sequelizejs.com/en/latest/docs/associations/#foreign-keys_1
      sequelizeSkipReferentialIntegrity?: boolean,
    };

export type ProcessedRelation = {
  description?: Description,
  validations?: Validations,
  type: FieldType,
  model: ModelName,
  isPlural: boolean,
  fkName: string,
  isInverse: boolean,
  inverseName: ?FieldName,
  // See above
  sequelizeSkipReferentialIntegrity?: boolean,
};

// ====================================
// AuthRule
// ====================================
// Notes:
// - The first matching rule wins
// - If there is no matching rule, the operation is rejected
// Custom `can` may receive (depending on the plugin):
// - `isClientSide`
// - `operation`
// - `user`, `userId`, `roleNames`
// - `baseType`, `baseNode`
// - `fieldName`, `fieldArgs`, `fieldType`, `fieldId`
// - `fieldValue`, `newFieldValue`
// - `godQuery`, `checkRouteToNode`
// - `db`
// ...and returns `boolean | null | Promise<boolean|null>`
// (`null` meaning undecided yet, e.g. ask me again later with the `fieldValue`)
export type AuthRule = {
  isClientSide?: AuthRuleSingularValue<boolean>,
  operation?: AuthRuleSingularValue<AuthOperation>,
  userId?: AuthRuleSingularValue<any>,
  roleNames?: AuthRulePluralValue<any>,
  baseType?: null | AuthRuleSingularValue<string>,  // null when request has no prior info (null -> node in a graph)
  fieldName?: AuthRuleSingularValue<string>,  // a 'field' here may be a model, a model attribute (field) or a relation name (think graph-wise)
  fieldType?: AuthRuleSingularValue<string>,
  fieldId?: AuthRuleSingularValue<any>,
  fieldValue?: AuthRuleSingularValue<any>,
  newFieldValue?: AuthRuleSingularValue<any>,
  canIfSatisfiesCheckUserIdFromNode?: string | Array<string>, // e.g. `project|users|edges|node|id` (from a Company instance)
  canIfSatisfiesCheckNodeIdFromUser?: string | Array<string>, // e.g. `id` (from a User instance)
  can: boolean | string /* custom fn (see above) */,
};

export type AuthOperation = 'read' | 'write';

export type AuthRuleSingularValue<T> =
  | T
  | { $is: T }
  | { $isnt: T }
  | { $in: Array<T> }
  | { $notIn: Array<T> };

export type AuthRulePluralValue<T> =
  | { $include: T }
  | { $dontInclude: T }
  | { $includeAny: Array<T> }
  | { $dontIncludeAny: Array<T> };

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
