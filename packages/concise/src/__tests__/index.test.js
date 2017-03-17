/* eslint-env jest */

import Concise from '..';

const schema1 = require('./schema1.json');
const schema2 = require('./schema2.json');

describe('main API', () => {
  it('should correctly merge two schemas', () => {
    const concise = new Concise();
    concise.addSchema(schema1);
    concise.addSchema(schema2);
    expect(concise.getSchema()).toMatchSnapshot();
  });
});
