- Flow: input types?
- Improve docs

* concise-sequelize:
    - Allow extension of `fields`, `validate` (model level), classMethods, instanceMethods, hooks...
      on top of some default functions
    - ...both for all models as well as model-by-model
    - Extension instanceMethods/hooks can use `this`, which will be bound to the model

    - Schema refinements: consider...
        - `isPublic` [default: `true`]
        - `isMassAssigned` [default: `true`]
        - `existsInClient` [default: `true`]
        - `existsInServer` [default: `true`]
        - etc.

- v1 release

- v2:
    - Auth (extend validation)
    - Embedded models via relations (for noSQL databases)
    - concise-firebase
