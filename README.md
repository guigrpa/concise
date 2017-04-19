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
    - Entity-relationship diagram in SVG format (`concise-svg`)
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

TBW

### Plugin options

#### Common options

TBW

#### concise-yaml



#### concise-json



#### concise-pg



#### concise-flow



#### concise-graphql



#### concise-svg



## [Changelog](https://github.com/guigrpa/concise/blob/master/CHANGELOG.md) :scroll:


## License (MIT) :books:

Copyright (c) [Guillermo Grau Panea](https://github.com/guigrpa) 2017-now

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
