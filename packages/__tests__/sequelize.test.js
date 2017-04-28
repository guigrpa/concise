/* eslint-env jest */

import Sequelize from 'sequelize';
import Concise from '../concise/src';
import { output } from '../concise-sequelize/src';

const DID_NOT_THROW = 'DID_NOT_THROW';
const checkThrown = (err, desc) => {
  if (err.message !== DID_NOT_THROW) return;
  throw new Error(`${desc} - should have thrown`);
};

describe('Sequelize output', () => {
  let sequelize;
  let db;

  beforeEach(() => {
    sequelize = new Sequelize('db', 'user', 'pwd', {
      dialect: 'sqlite',
      logging: null,
    });
  });

  afterEach(() => {
    if (db) {
      // db.sequelize.connectionManager.pool.destroyAllNow();
      db.sequelize.connectionManager.close();
      db.sequelize.close();
    }
    sequelize = null;
  });

  it('sanity', async () => {
    const concise = new Concise();
    concise.addSchema({
      models: {
        person: {
          fields: {
            name: { type: 'string' },
          },
        },
      },
    });
    db = await concise.output(output, { Sequelize, sequelize });
    await db.sequelize.sync();
    const person = await db.Person.create({ name: 'foo' });
    expect(person.name).toEqual('foo');
  });

  // =========================================================
  // Relations
  // =========================================================
  describe('relations', () => {
    it('simple case', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              id: {
                type: 'number',
                isAutoIncremented: true,
                isPrimaryKey: true,
              },
              name: { type: 'string' },
            },
          },
          post: {
            fields: {
              title: { type: 'string' },
            },
            relations: { person: true },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      const person = await db.Person.create({ name: 'Guille' });
      await person.addPost(await db.Post.create({ title: 'First post' }));
      const lookedUpPerson = await db.Person.findById(person.id);
      expect(lookedUpPerson.name).toEqual('Guille');
      const lookedUpPersonPosts = await lookedUpPerson.getPosts();
      expect(lookedUpPersonPosts.length).toEqual(1);
      expect(lookedUpPersonPosts[0].title).toEqual('First post');
      expect(lookedUpPersonPosts[0].personId).toEqual(person.id);
    });

    it('direct-only relation', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              id: {
                type: 'number',
                isAutoIncremented: true,
                isPrimaryKey: true,
              },
              name: { type: 'string' },
            },
          },
          post: {
            fields: {
              title: { type: 'string' },
            },
            relations: { person: { inverse: false } },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      const person = await db.Person.create({ name: 'Guille' });
      const post = await db.Post.create({
        title: 'First post',
        personId: person.id,
      });
      const relatedPerson = await post.getPerson();
      expect(relatedPerson.name).toEqual('Guille');
      expect(person.addPost).toBeUndefined();
    });
  });

  // =========================================================
  // Validations
  // =========================================================
  describe('validations', () => {
    it('isRequired', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              name: { type: 'string', isRequired: true },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      try {
        await db.Person.create({});
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isRequired');
      }
    });

    it('isUnique', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              name: { type: 'string', isUnique: true },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ name: 'foo' });
      try {
        await db.Person.create({ name: 'foo' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isUnique');
      }
    });

    it('isOneOf', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              name: {
                type: 'string',
                isOneOf: ['foo', 'bar'],
              },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ name: 'foo' });
      try {
        await db.Person.create({ name: 'qux' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isOneOf');
      }
    });

    it('hasAtLeastChars', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              name: { type: 'string', hasAtLeastChars: 1 },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ name: 'foo' });
      try {
        await db.Person.create({ name: '' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'hasAtLeastChars');
      }
    });

    it('isNumber (implicit)', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              age: { type: 'number' },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ age: 80 });
      try {
        await db.Person.create({ age: 'a' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isNumber');
      }
    });

    it('isLte', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              age: { type: 'number', isLte: 150 },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ age: 80 });
      try {
        await db.Person.create({ age: 166 });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isLte');
      }
    });

    it('satisfies (custom validation)', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              age: {
                type: 'number',
                satisfies: "val => { if (val > 150) throw new Error('must be <= 150!'); }",
              },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ age: 80 });
      try {
        await db.Person.create({ age: 166 });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'satisfies');
      }
    });

    it('other validations', async () => {
      const concise = new Concise();
      concise.addSchema({
        models: {
          person: {
            fields: {
              a: { type: 'string', hasAtMostChars: 4 },
              b: { type: 'string', hasLengthWithinRange: [1, 4] },
              email: { type: 'string', isEmail: true },
              url: { type: 'string', isUrl: true },
              ipAddress: { type: 'string', isIp: true },
              creditCard: { type: 'string', isCreditCard: true },
              c: { type: 'string', matchesPattern: ['[a-z][a-z]'] },
              num1: { type: 'number', isGte: 5 },
              num2: { type: 'number', isWithinRange: [12, 20] },
              myDate: { type: 'date' },
            },
          },
        },
      });
      db = await concise.output(output, { Sequelize, sequelize });
      await db.sequelize.sync();
      await db.Person.create({ a: '123' });
      try {
        await db.Person.create({ a: '123456789' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'hasAtMostChars');
      }
      await db.Person.create({ b: '123' });
      try {
        await db.Person.create({ b: '123456789' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'hasLengthWithinRange');
      }
      try {
        await db.Person.create({ b: '' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'hasLengthWithinRange');
      }
      await db.Person.create({ email: 'guille@example.com' });
      try {
        await db.Person.create({ email: 'fefje@@wrong' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isEmail');
      }
      await db.Person.create({ url: 'http://www.google.com' });
      try {
        await db.Person.create({ url: 'goog' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isUrl');
      }
      await db.Person.create({ ipAddress: '128.0.0.1' });
      try {
        await db.Person.create({ ipAddress: 'xxx' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isIp');
      }
      await db.Person.create({ creditCard: '5492165749242439' });
      try {
        await db.Person.create({ creditCard: 'xxx' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isCreditCard');
      }
      await db.Person.create({ c: 'dd' });
      try {
        await db.Person.create({ c: '1' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'matchesPattern');
      }
      await db.Person.create({ num1: 6 });
      try {
        await db.Person.create({ num1: 1 });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isGte');
      }
      await db.Person.create({ num2: 15 });
      try {
        await db.Person.create({ num2: 1 });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isWithinRange');
      }
      try {
        await db.Person.create({ num2: 221 });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isWithinRange');
      }
      await db.Person.create({ myDate: new Date() });
      try {
        await db.Person.create({ myDate: '.' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        checkThrown(err, 'isDate');
      }
    });
  });

  // =========================================================
  // Extensions
  // =========================================================
  const SCHEMA = {
    models: {
      person: {
        fields: {
          name: { type: 'string' },
          isAlive: {
            type: 'boolean',
            defaultValue: true,
            isRequired: true,
          },
        },
      },
    },
  };
  describe('Sequelize-specific extensions', () => {
    it('validate extensions (model-level)', async () => {
      const concise = new Concise();
      concise.addSchema(SCHEMA);
      db = await concise.output(output, {
        Sequelize,
        sequelize,
        extensions: {
          person: {
            validate: () => ({
              isNameUnicorn() {
                if (this.name !== 'unicorn') {
                  throw new Error('must be a unicorn!');
                }
              },
            }),
          },
        },
      });
      await db.sequelize.sync();
      await db.Person.create({ name: 'unicorn' });
      try {
        await db.Person.create({ name: 'non-unicorn' });
        throw new Error(DID_NOT_THROW);
      } catch (err) {
        if (err.message === DID_NOT_THROW) {
          throw new Error('model validation should have failed');
        }
      }
    });

    it('class methods', async () => {
      const concise = new Concise();
      concise.addSchema(SCHEMA);
      db = await concise.output(output, {
        Sequelize,
        sequelize,
        extensions: {
          person: {
            classMethods: ({ db: _db }) => ({
              async findAlive() {
                return _db.Person.findAll({ where: { isAlive: true } });
              },
            }),
          },
        },
      });
      await db.sequelize.sync();
      await db.Person.create({ name: 'John' });
      await db.Person.create({ name: 'Jack', isAlive: false });
      const allPeople = await db.Person.findAll();
      expect(allPeople.length).toEqual(2);
      const alivePeople = await db.Person.findAlive();
      expect(alivePeople.length).toEqual(1);
    });

    it('class methods (configured via $all)', async () => {
      const concise = new Concise();
      concise.addSchema(SCHEMA);
      db = await concise.output(output, {
        Sequelize,
        sequelize,
        extensions: {
          $all: {
            classMethods: ({ db: _db, className }) => ({
              async findAlive() {
                return _db[className].findAll({ where: { isAlive: true } });
              },
            }),
          },
        },
      });
      await db.sequelize.sync();
      await db.Person.create({ name: 'John' });
      await db.Person.create({ name: 'Jack', isAlive: false });
      const allPeople = await db.Person.findAll();
      expect(allPeople.length).toEqual(2);
      const alivePeople = await db.Person.findAlive();
      expect(alivePeople.length).toEqual(1);
    });

    it('instance methods', async () => {
      const concise = new Concise();
      concise.addSchema(SCHEMA);
      db = await concise.output(output, {
        Sequelize,
        sequelize,
        extensions: {
          person: {
            instanceMethods: () => ({
              async die() {
                this.isAlive = false;
                return this.save();
              },
            }),
          },
        },
      });
      await db.sequelize.sync();
      const person = await db.Person.create({ name: 'John' });
      expect(person.isAlive).toEqual(true);
      await person.die(); // never thought I'd ever write this ;)
      expect(person.isAlive).toEqual(false);
    });

    it('hooks', async () => {
      const concise = new Concise();
      concise.addSchema(SCHEMA);
      db = await concise.output(output, {
        Sequelize,
        sequelize,
        extensions: {
          person: {
            hooks: () => ({
              /* eslint-disable no-param-reassign */
              async beforeCreate(instance) {
                instance.name = `${instance.name} MODIFIED`;
              },
              /* eslint-enable no-param-reassign */
            }),
          },
        },
      });
      await db.sequelize.sync();
      const person = await db.Person.create({ name: 'John' });
      expect(person.name).toEqual('John MODIFIED');
    });
  });
});
