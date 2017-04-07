/* eslint-env jest */

import path from 'path';
import Concise from '../concise/src';
import { input as yamlInput } from '../concise-yaml/src';
import { output } from '../concise-pg/src';

describe('PG output', () => {
  it('schema1.yaml -> pg', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    const sql = await concise.output(output);
    expect(sql).toMatchSnapshot();
  });

  it('schema1.yaml + schema2.yaml -> pg', async () => {
    const concise = new Concise();
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema1.yaml'),
    });
    await concise.input(yamlInput, {
      file: path.join(__dirname, './fixtures/schema2.yaml'),
    });
    const sql = await concise.output(output);
    expect(sql).toMatchSnapshot();
  });
});
