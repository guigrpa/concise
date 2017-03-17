/* eslint-env jest */

import mergeSchemas from '../mergeSchemas';

const schema1 = require('./schema1.json');
const schema2 = require('./schema2.json');

describe('mergeSchemas', () => {
  it('should correctly merge two schemas', () => {
    const merged = mergeSchemas(schema1, schema2);
    expect(merged).toMatchSnapshot();
  });
});
