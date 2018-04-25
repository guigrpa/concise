// @flow

/* eslint-disable no-console */

import path from 'path';
import Sequelize from 'sequelize';
import Concise from 'concise';
import { input } from 'concise-yaml';
import { output } from 'concise-sequelize';

const run = async () => {
  try {
    const concise = new Concise();
    await concise.input(input, {
      file: path.join(__dirname, '../../__tests__/fixtures/schema3_bb.yaml'),
    });
    // await concise.input(input, {
    //   file: path.join(__dirname, '../../__tests__/fixtures/schema1.yaml'),
    // });
    // await concise.input(input, {
    //   file: path.join(__dirname, '../../__tests__/fixtures/schema2.yaml'),
    // });
    const sequelize = new Sequelize('database', 'username', 'password', {
      dialect: 'sqlite',
    });
    const db = await concise.output(output, { Sequelize, sequelize });
    await db.sequelize.sync();
    const person = await db.Person.create({
      name: 'Juan Pérez',
      acronym: 'JP',
    });
    console.log(person.get());
  } catch (err) {
    console.error(err);
  }
};

run();
