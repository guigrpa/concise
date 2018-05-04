- Schema: add `isMassAssignable` attribute to fields
- Sequelize: honour `existsInClient` and `existsInServer` in `model.toJSON()` and `isMassAssignable` in `model.set()`
- GraphQL: don't include models/fields if either `existsInServer` or `existsInClient` are unset.

## 0.3.0 (2018-4-27)

- Sequelize: update to support Sequelize v4.
- Bump all deps.

## 0.2.3 (2017-5-15)

- Firebase: add `ignorePrimaryKey` option.

## 0.2.2 (2017-5-15)

- Firebase: include root `rules` property.
- Firebase: bugfix: correctly write rules for `isOneOf` validation.

## 0.2.1 (2017-5-2)

- Add Firebase initial support, with automatic generation of `.validate` rules. (`concise-firebase`)

## 0.2.0 (2017-4-28)

- Schema simplifications:
  - Include validations in field/relations, not inside a `validations` attributes.
  - Infer model name automatically from a direct relation's name (and its `isPlural` attribute).

## 0.1.0 (2017-4-26)

First release.
