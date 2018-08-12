const _ = require('lodash');
const Boom = require('boom');

const name = 'hapi-field-auth';

const split = (arg) => {
  if (!arg) return [];
  if (typeof arg === 'string') return arg.split(' ');
  return arg;
};

const register = (server) => {
  server.ext('onPreResponse', (request, h) => {
    const { payload, route, auth } = request;
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
    const authRole = split(credentials.role);
    const keys = Object.keys(payload);
    settings.forEach(({ fields, scope, role }) => {
      if (_.intersection(keys, fields).length) {
        const requiredScope = split(scope);
        if (requiredScope.length && _.intersection(requiredScope, authScope).length === 0) {
          throw Boom.forbidden(`fields [${fields}] missing authorization scope [${requiredScope}]`);
        }
        const requiredRole = split(role);
        if (requiredRole.length && _.intersection(requiredRole, authRole).length === 0) {
          throw Boom.forbidden(`fields [${fields}] missing authorization role [${requiredRole}]`);
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
