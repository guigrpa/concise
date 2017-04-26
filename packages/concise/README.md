# concise :clipboard: [![Build Status](https://travis-ci.org/guigrpa/concise.svg?branch=master)](https://travis-ci.org/guigrpa/concise) [![Coverage Status](https://coveralls.io/repos/github/guigrpa/concise/badge.svg?branch=master)](https://coveralls.io/github/guigrpa/concise?branch=master) [![npm version](https://img.shields.io/npm/v/concise.svg)](https://www.npmjs.com/package/concise)

A tool belt for concise schemas.


## Why? :sparkles:

* Write your schema once, concisely (using e.g. YAML or JSON)
* If it's too large, divide it into manageable chunks
* Use plugins to import it into Concise and then export it again in whatever format you need:
    - YAML (`concise-yaml`)
    - JSON (`concise-json`)
    - PostgreSQL SQL (`concise-pg`)
    - Flow types (`concise-flow`)
    - GraphQL schema language (`concise-graphql`)
    - Entity-relationship diagram (`concise-diagram`)
    - Sequelize (*coming up!*)
    - Firebase database rules (*coming up!*)
* Update your schema in one place!


## Installation

You will need to install `concise` and the input/output plugins you need. For example:

```bash
$ npm install concise concise-yaml concise-pg
```


## Usage

### Concise input/output

TBW

### Concise schema reference

Here is an example schema written in YAML:

```
models:
  common:
    isIncludeOnly: true
    fields:
      id:
        type: uuid
        isPrimaryKey: true
      notes:
        type: string
        isLong: true

  person:
    description: A project member
    includes: { common: true }
    fields:
      name:
        description: Name of the user
        type: string
        validations:
          isRequired: true
          isUnique: true
      surname: { type: string }
      aBoolean:
        type: boolean
        validations:
          isRequired: true
        defaultValue: false
    relations:
      project: true

  project:
    includes: { common: true }
    fields:
      name: { type: string }
    relations:
      projectManager:
        model: user
        validations:
          isRequired: true
      technicalManager:
        model: user
        inverse: false
```

This simple schema already illustrates some of concise's features:

* **Includes**: common fields (and relations) can be extracted from models. Models marked as `isIncludeOnly` may have special treatment in some plugins, e.g. `concise-pg` will not generate tables for them, `concise-diagram` will omit them in diagrams, etc.

* **Comments**: `description` attributes can be set on models, fields and relations. They are *strongly recommended* and are taken into account in all built-in plugins: `concise-graphql` includes them in schema (so they can be shown in the great GraphiQL tool), `concise-diagram` shows them as tooltips in diagrams, `concise-pg` generates `COMMENT` SQL statements for them, etc.

* **Relations** are defined at the model that contains the foreign key (e.g. in a *1:N* relation, at the *1* end). In the example above, a `person` belongs to a `project`.

* **Bidirectional relations**: relations are bidirectional by default, and the *inverse* relation (in the previous example, from `project` to `person`) is plural by default. The inverse relation can be fully customised and even removed (set to `false`).

* **Validation rules** can be applied to both model fields and relations.


Check out the [full reference (Flow definitions)](https://github.com/guigrpa/concise/blob/master/packages/concise-types/index.js). The root type for user-provided schema is `Schema`.

### Plugin options

#### Common options

Input options:

* `file?` (`string`): if specified, raw input schema will be read from the specified path
* `raw?` (`string`): if specified, its value is used as raw input schema
* **Note**: either `file` or `raw` should be specified for input processors

Output options:

* `file?` (`string`): if specified, output will be written to the specified path

#### concise-yaml

Input/output.

No specific options.

#### concise-json

Input/output.

Output options:
* `prettyJson?` (`boolean` = `false`): prettify JSON output

#### concise-pg

Output-only.

Output options:
* `schema?` (`string`): PostgreSQL schema; if unspecified, no schema is used
  in the SQL definitions (which corresponds to the `public` schema)

#### concise-flow

Output-only.

No specific options.

#### concise-graphql

Output-only.

Output options:
* `relay?` (`boolean` = `false`): include `Node` interface
  and `node` root field, define connections, etc.
* `storyboard?` (`boolean` = `false`): include `storyId` field
  in mutation input types to support end-to-end Storyboard stories

#### concise-diagram

Output-only.

Output options:
* `filterEdges?` (`{ from: ModelName, to: ModelName, as: FieldName, isRequired: boolean } => boolean`):
  return `true` if a given edge must be shown. Default: all edges are shown
* `edgeLabels?` (`boolean` = `true`): show edge labels


## Examples

Check out the [`concise-examples` package](https://github.com/guigrpa/concise/blob/master/packages/concise-examples), as well as the [sample schema](https://github.com/guigrpa/concise/blob/master/packages/__tests__/fixtures).


## [Changelog](https://github.com/guigrpa/concise/blob/master/CHANGELOG.md) :scroll:


## License (MIT) :books:

Copyright (c) [Guillermo Grau Panea](https://github.com/guigrpa) 2017-now

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
