- Firebase: include root `rules` property
- Firebase: bugfix: correctly write rules for `isOneOf` validation

## 0.2.1 (2017-5-2)

- Add Firebase initial support, with automatic generation of `.validate` rules (`concise-firebase`)

## 0.2.0 (2017-4-28)

- Schema simplifications:
  - Include validations in field/relations, not inside a `validations` attributes.
  - Infer model name automatically from a direct relation's name (and its `isPlural` attribute)

## 0.1.0 (2017-4-26)

First release.
