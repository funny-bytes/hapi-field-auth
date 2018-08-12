const Hapi = require('hapi');
const hapiAuthBasic = require('hapi-auth-basic');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const hapiFieldAuth = require('../src/index');

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
global.should = chai.should();

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
  return {
    isValid: false,
  };
};

async function setup() {
  const server = new Hapi.Server({
    port: 9001,
  });
  const route1 = {
    method: 'GET',
    path: '/test',
    options: {
      auth: false,
    },
    handler: () => 'ok',
  };
  const route2 = {
    method: 'PATCH',
    path: '/test',
    options: {
      auth: {
        access: {
          scope: ['write', 'write.extended'],
        },
      },
      plugins: {
        'hapi-field-auth': [{
          fields: ['protected'],
          scope: ['write.extended'],
        }],
      },
    },
    handler: () => 'ok',
  };
  await server.register([hapiAuthBasic, hapiFieldAuth]);
  server.auth.strategy('simple', 'basic', { validate });
  server.auth.default('simple');
  await server.route([route1, route2]);
  await server.start();
  return server;
}

describe('hapi-field-auth / no options', async () => {
  let server;

  beforeEach(async () => {
    server = await setup();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should not interfer unprotected routes', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/test',
    });
    expect(res.statusCode).to.be.equal(200);
  });

  it('should not interfer protected routes', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test',
    });
    expect(res.statusCode).to.be.equal(401);
  });

  it('should allow fields without special scope', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test',
      headers: {
        authorization: 'Basic d3JpdGVyOnRlc3Q=', // writer:test
      },
      payload: {
        bla: true,
      },
    });
    expect(res.statusCode).to.be.equal(200);
  });

  it('should protect fields with special scope / scope NOT sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test',
      headers: {
        authorization: 'Basic d3JpdGVyOnRlc3Q=', // writer:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(403);
  });

  it('should protect fields with special scope / scope NOT sufficient', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/test',
      headers: {
        authorization: 'Basic YWRtaW46dGVzdA==', // admin:test
      },
      payload: {
        bla: true,
        protected: true,
      },
    });
    expect(res.statusCode).to.be.equal(200);
  });
});
