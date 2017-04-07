/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input as yamlInput } from '../concise-yaml/src';
import { input, output } from '../concise-json/src';

describe('JSON in/out', () => {
  it('schema1.yaml -> json', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const json = await concise.output(output);
    expect(json).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> json', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const json = await concise.output(output);
    expect(json).toMatchSnapshot();
  });

  it('json -> json', async () => {
    const concise = new Concise();
    await concise.input(input, {
      file: path.join(__dirname, './fixtures/schema1.json'),
    });
    const json = await concise.output(output);
    expect(json).toMatchSnapshot();
  });
});
