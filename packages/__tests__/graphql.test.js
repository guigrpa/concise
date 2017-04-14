/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input as yamlInput } from '../concise-yaml/src';
import { output } from '../concise-graphql/src';

describe('GraphQL schema output', () => {
  it('schema1.yaml -> GraphQL', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const gqlSchema = await concise.output(output);
    expect(gqlSchema).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> GraphQL', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const gqlSchema = await concise.output(output);
    expect(gqlSchema).toMatchSnapshot();
  });
});
