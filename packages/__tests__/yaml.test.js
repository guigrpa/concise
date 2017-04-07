/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input, output } from '../concise-yaml/src';

describe('YAML in/out', () => {
  it('schema1.yaml -> yaml', async () => {
    const concise = new Concise();
    await concise.input(input, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const yaml = await concise.output(output);
    expect(yaml).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> yaml', async () => {
    const concise = new Concise();
    await concise.input(input, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(input, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const yaml = await concise.output(output);
    expect(yaml).toMatchSnapshot();
  });
});
