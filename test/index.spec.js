const hapiAuthBasic = require('@hapi/basic');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const semver = require('semver');
const hapiFieldAuth = require('..'); // eslint-disable-line import/order

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
global.should = chai.should();

const nodeVersion = process.version;
const node12 = semver.satisfies(nodeVersion, '>=12.x.x');
const Hapi = node12 ? require('hapi19') : require('hapi18');
const Joi = node12 ? require('joi17') : require('joi16');

// eslint-disable-next-line no-console
console.log(`Testing Node ${nodeVersion}, Hapi ${node12 ? '19' : '18'}, Joi ${node12 ? '17' : '16'}`);

const validate = async (request, username) => {
  if (username === 'admin') {
    return {
      isValid: true,
      credentials: {
        username,
        scope: ['write', 'write.extended'],
      },
    };
  }
  if (username === 'writer') {
    return {
      isValid: true,
      credentials: {
        username,
        scope: ['write'],
      },
    };
  }
  if (username === 'owner') {
    return {
      isValid: true,
      credentials: {
        username,
        scope: ['owner.4711'],
      },
    };
  }
  return {
    isValid: false,
  };
};

const listener = {
  errors: (request, event, tags) => { // eslint-disable-line no-unused-vars
    // console.log('####', event);
  },
  handlers: () => {},
};

const setup = async () => {
  const server = new Hapi.Server({
    port: 9004,
    // debug: {
    //   request: ['error'],
    // },
  });
  const route1 = {
    method: 'GET',
    path: '/test/{id}',
    options: {
      auth: false,
    },
    handler: () => {
      listener.handlers();
      return 'ok';
    },
  };
  const route2 = {
    method: 'PATCH',
    path: '/test/{id}',
    options: {
      auth: {
        access: {
          scope: ['write', 'write.extended', 'owner.{params.id}'],
        },
      },
      plugins: {
        'hapi-field-auth': [{
          fields: ['protected'],
          scope: ['write.extended', 'owner.{params.id}'],
        },
        {
          fields: ['validatedField'],
          scope: ['write.extended', 'owner.{params.id}'],
          validate: Joi.date().min('now').allow(null),
        }],
      },
    },
    handler: () => {
      listener.handlers();
      return 'ok';
    },
  };
  await server.register([hapiAuthBasic, hapiFieldAuth]);
  server.auth.strategy('simple', 'basic', { validate });
  server.auth.default('simple');
  await server.route([route1, route2]);
  await server.start();
  return server;
};

describe('hapi-field-auth / no options', async () => {
  let server;

  beforeEach(async () => {
    server = await setup();
    sinon.spy(listener, 'errors');
    sinon.spy(listener, 'handlers');
    server.events.on({ name: 'request', filter: { tags: ['error'] } }, listener.errors);
  });

  afterEach(async () => {
    listener.errors.restore();
    listener.handlers.restore();
    await server.stop();
  });

  it('should not affect unprotected routes', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test/4711',
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.handlers.calledOnce).to.equal(true);
  });

  it('should not affect protected routes', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
    });
    expect(res.statusCode).to.be.equal(401);
    expect(listener.handlers.called).to.equal(false);
  });

  it('should not run if protected route is not authenticated', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
    });
    expect(res.statusCode).to.be.equal(401);
    expect(listener.errors.called).to.be.equals(false);
    expect(listener.handlers.called).to.equal(false);
  });

  it('should allow fields if no special scope', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic d3JpdGVyOnRlc3Q=', // writer:test
      },
      payload: {
        bla: true,
      },
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.handlers.calledOnce).to.equal(true);
  });

  it('should protect fields if field-level scope / scope not sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic d3JpdGVyOnRlc3Q=', // writer:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(403);
    const { message } = JSON.parse(res.payload);
    expect(message).to.be.equal('fields [protected] missing authorization scope [write.extended,owner.4711]');
    expect(listener.handlers.called).to.equal(false);
  });

  it('should validate fields if field-level scope / validation fails for scope ', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic d3JpdGVyOnRlc3Q=', // writer:test
      },
      payload: {
        bla: true,
        validatedField: '2000-07-10T12:24:05.421Z',
      },
    });
    expect(res.statusCode).to.be.equal(400);
    expect(listener.handlers.called).to.equal(false);
  });

  it('should protect fields if field-level scope / scope sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic YWRtaW46dGVzdA==', // admin:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.handlers.calledOnce).to.equal(true);
  });

  it('should not validate fields if field-level scope / scope sufficient for no validation ', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic YWRtaW46dGVzdA==', // admin:test
      },
      payload: {
        bla: true,
        validatedField: '2000-07-10T12:24:05.421Z',
      },
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.handlers.calledOnce).to.equal(true);
  });

  it('should issue error if protected route has empty payload', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic YWRtaW46dGVzdA==', // admin:test
      },
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.errors.calledOnce).to.be.equals(true);
    expect(listener.handlers.calledOnce).to.equal(true);
    const { tags, data } = listener.errors.getCall(0).args[1]; // event
    expect(tags).to.be.deep.equal(['error']);
    expect(data).to.be.equal('plugin hapi-field-auth: payload is empty');
  });

  it('should protect fields if field-level scope with params / scope not sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4712',
      headers: {
        authorization: 'Basic b3duZXI6dGVzdA==', // owner:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(403);
    expect(listener.handlers.called).to.equal(false);
  });

  it('should protect fields if field-level scope with params / scope sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test/4711',
      headers: {
        authorization: 'Basic b3duZXI6dGVzdA==', // owner:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(200);
    expect(listener.handlers.calledOnce).to.equal(true);
  });
});
