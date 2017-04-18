// @flow

/* eslint-disable no-console */

import path from 'path';
import Concise from 'concise';
import { input } from 'concise-yaml';
import { output } from 'concise-svg';

const run = async () => {
  try {
    const concise = new Concise();
    await concise.input(input, {
      file: path.join(__dirname, '../../__tests__/fixtures/schema3_bb.yaml'),
    });
    await concise.output(output, {
      file: path.join(__dirname, 'playSvg.svg'),
      filterEdges: ({ to, as }) => !(to === 'user' && as === 'creator'),
    });
  } catch (err) {
    console.error(err);
  }
};

run();
