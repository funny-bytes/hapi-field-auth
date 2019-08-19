const Boom = require('@hapi/boom');
const Mustache = require('mustache');
const Joi = require('@hapi/joi');

const name = 'hapi-field-auth';

const split = (arg) => {
  if (!arg) return [];
  if (typeof arg === 'string') return arg.split(' ');
  return arg;
};

const intersection = (arr1, arr2) => arr1
  .reduce((acc, x) => (arr2.includes(x) ? [...acc, x] : acc), []);

const hasIntersection = (arr1, arr2) => arr1
  .reduce((acc, x) => acc || arr2.includes(x), false);

const resolve = (tpl, context) => Mustache
  .render(tpl.replace(/\{/, '{{{').replace(/\}/, '}}}'), context);

const register = (server) => {
  server.ext('onCredentials', (request, h) => {
    const {
      payload, route, auth, params, query,
    } = request;
    const rules = route.settings.plugins[name];
    if (!rules) { // nothing to do
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
    rules.forEach(({ fields, scope, validate }) => {
      const protectedProps = intersection(targetProps, fields);
      const requiredScope = split(scope).map((s) => resolve(s, {
        params, query, payload, credentials,
      }));
      if (protectedProps.length && hasIntersection(requiredScope, authScope)) {
        return; // sufficient scope -- rule passed
      }
      if (validate) {
        fields.forEach((field) => {
          const result = Joi.validate(payload[field], validate);
          if (result.error) {
            throw Boom.badRequest(result.error.message.replace('value', field));
          }
        });
        return; // validation passed -- rule passed
      }
      if (protectedProps.length) {
        throw Boom.forbidden(`fields [${protectedProps}] missing authorization scope [${requiredScope}]`);
      }
    });
    return h.continue; // all rules passed
  });
};

module.exports = {
  name,
  register,
};
