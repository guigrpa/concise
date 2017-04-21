// @flow

/* eslint-disable no-console */

import path from 'path';
import Concise from 'concise';
import { input } from 'concise-yaml';
import { output as outputSvg } from 'concise-diagram';
import { output as outputGraphql } from 'concise-graphql';
import { output as outputPg } from 'concise-pg';

const run = async () => {
  const concise = new Concise();
  await concise.input(input, {
    file: path.join(__dirname, '../../__tests__/fixtures/schema4_bookings.yaml'),
  });
  await concise.output(outputSvg, {
    file: path.join(__dirname, 'playBookings.svg'),
  });
  await concise.output(outputGraphql, {
    file: path.join(__dirname, 'playBookings.graphql'),
    useRelayConventions: true,
  });
  await concise.output(outputPg, {
    file: path.join(__dirname, 'playBookings.sql'),
  });
};

run();
