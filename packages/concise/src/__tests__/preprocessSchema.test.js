/* eslint-env jest */

import preprocessSchema from '../preprocessSchema';

describe('preprocessSchema', () => {
  it('respects unknown schema attributes', () => {
    const processedSchema = preprocessSchema({
      models: {
        person: {
          fields: {
            name: { type: 'string', foo: 3 },
          },
          foo: 3,
        },
      },
      schemaFoo: 5,
    });
    expect(processedSchema).toMatchSnapshot();
  });

  it('processes included fields', () => {
    const processedSchema = preprocessSchema({
      models: {
        common: {
          isIncludeOnly: true,
          fields: { id: { type: 'string' } },
        },
        person: {
          includes: { common: true },
          fields: {
            name: { type: 'string' },
          },
        },
      },
    });
    expect(processedSchema).toMatchSnapshot();
  });

  it('processes a shorthand relation', () => {
    const schema = {
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        post: {
          fields: { id: { type: 'string' } },
          relations: {
            person: true,
          },
        },
      },
    };
    const processedSchema = preprocessSchema(schema);
    expect(processedSchema).toMatchSnapshot();
    // Alternatively, the relation can be defined as an empty object
    schema.models.post.relations.person = {};
    expect(preprocessSchema(schema)).toEqual(processedSchema);
  });

  it('completes custom relations', () => {
    const schema = {
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        post: {
          fields: { id: { type: 'string' } },
          relations: {
            author: {
              model: 'person',
              validations: { required: true },
            },
          },
        },
      },
    };
    const processedSchema = preprocessSchema(schema);
    expect(processedSchema).toMatchSnapshot();
    // must be immutable!
    expect(processedSchema).not.toBe(schema);
  });

  it('allows disabling inverse relations', () => {
    const processedSchema = preprocessSchema({
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        post: {
          fields: { id: { type: 'string' } },
          relations: {
            person: {
              inverse: false,
            },
          },
        },
      },
    });
    expect(processedSchema).toMatchSnapshot();
  });

  it('allows custom inverse relations (name)', () => {
    const processedSchema = preprocessSchema({
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        post: {
          fields: { id: { type: 'string' } },
          relations: {
            person: {
              inverse: { name: 'createdPosts' },
            },
          },
        },
      },
    });
    expect(processedSchema).toMatchSnapshot();
  });

  it('allows custom inverse relations (singular)', () => {
    const processedSchema = preprocessSchema({
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        address: {
          fields: { id: { type: 'string' } },
          relations: {
            person: {
              inverse: { isPlural: false },
            },
          },
        },
      },
    });
    expect(processedSchema).toMatchSnapshot();
  });

  it('does not modify the original schema', () => {
    const schema = {
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        address: {
          fields: { id: { type: 'string' } },
          relations: { person: true },
        },
      },
    };
    preprocessSchema(schema);
    expect(schema).toEqual({
      models: {
        person: {
          fields: { id: { type: 'string' } },
        },
        address: {
          fields: { id: { type: 'string' } },
          relations: { person: true },
        },
      },
    });
  });
});
