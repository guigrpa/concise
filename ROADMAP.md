- Rethink Flow: input types?
- Improve docs
- Schema validation?
- First release

* concise-sequelize:
    - Pass in sequelize as an arg; concise configures it
    - No OOP

    - Allow extension of `fields`, `validate`, classMethods, instanceMethods, hooks...
      on top of some default functions
    - ...both for all models as well as model-by-model
    - Extension instanceMethods/hooks can use `this`, which will be bound to the model

    - More validations: `isOneOf`, `isNotBlank`, custom fn as string, etc (see giu)
    - Schema refinements: consider...
        - `isPublic` [default: `true`]
        - `isMassAssigned` [default: `true`]
        - `isSaved` [default: `true`]
        - `existsInClient` [default: `true`]
        - `existsInServer` [default: `true`]
        - etc.

- v2:
    - Auth (extend validation)
    - Embedded models via relations (for noSQL databases)
    - concise-firebase
