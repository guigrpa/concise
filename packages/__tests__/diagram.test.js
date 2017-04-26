/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input as yamlInput } from '../concise-yaml/src';
import { output } from '../concise-diagram/src';

describe('Flow output', () => {
  it('schema1.yaml -> diagram', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const svg = await concise.output(output);
    expect(svg).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> diagram', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const svg = await concise.output(output);
    expect(svg).toMatchSnapshot();
  });

  it('filters edges with custom function', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema3_bb.yaml'),
    });
    const svg = await concise.output(output, {
      filterEdges: ({ to, as }) => !(to === 'user' && as === 'creator'),
    });
    expect(svg).toMatchSnapshot();
  });
});
