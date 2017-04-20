/* eslint-env jest */

import preprocessSchema from '../preprocessSchema';

describe('preprocessSchema', () => {
  it('should respect unknown schema attributes', () => {
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

  it('should process included fields', () => {
    const processedSchema = preprocessSchema({
      models: {
        common: {
          includeOnly: true,
          fields: {
            id: { type: 'string' },
          },
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

  it('should complete a shorthand relation', () => {
    const processedSchema = preprocessSchema({
      models: {
        person: {
          fields: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        post: {
          fields: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
          relations: {
            person: true,
          },
        },
      },
    });
    expect(processedSchema).toMatchSnapshot();
  });
});
