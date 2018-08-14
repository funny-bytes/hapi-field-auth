const Boom = require('boom');
const Mustache = require('mustache');

const name = 'hapi-field-auth';

const split = (arg) => {
  if (!arg) return [];
  if (typeof arg === 'string') return arg.split(' ');
  return arg;
};

const intersection = (arr1, arr2) => arr1.reduce((acc, x) => acc || arr2.includes(x), false);

const resolve = (tpl, context) => Mustache
  .render(tpl.replace(/\{/, '{{{').replace(/\}/, '}}}'), context);

const register = (server) => {
  server.ext('onPreResponse', (request, h) => {
    const {
      payload, route, auth, params, query,
    } = request;
    const settings = route.settings.plugins[name];
    if (!settings) { // nothing to do
      return h.continue;
    }
    const { isAuthenticated, credentials } = auth || {};
    if (!isAuthenticated || !credentials) {
      request.log(['error'], `plugin ${name}: not authenticated`);
      return h.continue;
    }
    if (!payload) {
      request.log(['error'], `plugin ${name}: payload is empty`);
      return h.continue;
    }
    const authScope = split(credentials.scope);
    const targetProps = Object.keys(payload);
    settings.forEach(({ fields, scope }) => {
      if (intersection(targetProps, fields)) {
        const requiredScope = split(scope).map(s => resolve(s, {
          params, query, payload, credentials,
        }));
        if (requiredScope.length && !intersection(requiredScope, authScope)) {
          throw Boom.forbidden(`fields [${fields}] missing authorization scope [${requiredScope}]`);
        }
      }
    });
    return h.continue;
  });
};

module.exports = {
  name,
  register,
};
