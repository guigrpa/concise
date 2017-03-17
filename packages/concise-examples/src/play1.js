// @flow

import path from 'path';
import Concise from 'concise';
import { input } from 'concise-yaml';
import { output } from 'concise-json';

const run = async (name) => {
  const concise = new Concise();
  await concise.input(input, {
    file: path.join(__dirname, `../fixtures/${name}.yaml`),
  });
  await concise.output(output, {
    file: path.join(__dirname, `../fixtures/${name}.json`),
  });
};

run('schema1');
run('schema2');
