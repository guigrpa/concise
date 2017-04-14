/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input as yamlInput } from '../concise-yaml/src';
import { output } from '../concise-flow/src';

describe('Flow output', () => {
  it('schema1.yaml -> flow', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const flowTypes = await concise.output(output);
    expect(flowTypes).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> flow', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const flowTypes = await concise.output(output);
    expect(flowTypes).toMatchSnapshot();
  });
});
