# hapi-field-auth

Hapi server plugin for field-level authorization.

![main workflow](https://github.com/funny-bytes/hapi-field-auth/actions/workflows/main.yml/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/funny-bytes/hapi-build-auth/badge.svg?branch=master)](https://coveralls.io/github/funny-bytes/hapi-build-auth?branch=master)
[![Dependencies Status](https://david-dm.org/funny-bytes/hapi-field-auth.svg)](https://david-dm.org/funny-bytes/hapi-field-auth)
[![Maintainability](https://api.codeclimate.com/v1/badges/9a28b9cc8e829ae17a80/maintainability)](https://codeclimate.com/github/funny-bytes/hapi-field-auth/maintainability)
[![node](https://img.shields.io/node/v/hapi-field-auth.svg)]()
[![code style](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)
[![License Status](http://img.shields.io/npm/l/hapi-field-auth.svg)]()

Tested with

* Node 12/14/15, Hapi 18/19/20, Joi 17
* Node 10, Hapi 18, Joi 16

## Install

```bash
npm install hapi-field-auth
```

## Purpose

This plugin provides field-level authorization (not authentication)
for Hapi routes -- particularly useful for *PATCH* routes.
If the request payload has fields with special constraints
in respect to the `scope` of the authenticated user,
this plugin allows restricting access on field-level
and adding field validation depending on the `scope`.

A prerequisite is authentication.
Use any authentication plugin, e.g., `hapi-auth-basic` or `hapi-auth-bearer-token`.
The authentication plugin must properly set `request.auth.credentials.scope`
with the authenticated user's scope for this plugin to work.

Dynamic scopes referring to the request object (query, params, payload, and credentials)
are supported, e.g., `user-{params.id}`. Prefix characters `!` and `+` are not (yet) supported.

## Usage

Register the plugin with Hapi server like this:
```js
const Hapi = require('@hapi/hapi');
const hapiAuthBasic = require('@hapi/basic');
const hapiFieldAuth = require('hapi-field-auth');

const server = new Hapi.Server({
  port: 3000,
});

const provision = async () => {
  await server.register([hapiAuthBasic, hapiFieldAuth]);
  // ...
  await server.start();
};

provision();
```

Your route configuration may look like this:
```js
server.route({
  method: 'PATCH',
  path: '/example',
  options: {
    auth: {
      access: { // route-level auth -> HTTP 401/403
        scope: ['write', 'write.extended'], // multiple scopes on route-level
      },
    },
    validate: {
      payload: ExampleSchema, // Joi schema validation -> HTTP 400
    },
    plugins: {
      'hapi-field-auth': [{ // add field-level authorization -> HTTP 403
        fields: ['myProtectedField'], // request payload properties
        scope: ['write.extended'], // restricted scopes on field-level
      }, {
        fields: ['activeUntil', 'validUntil'],
        scope: ['write.extended'], // restricted scopes on field-level...
        validate: Joi.date().min('now').allow(null), // ...OR additional Joi schema -> HTTP 400
      }],
    },
  },
  handler: function (request, h) {
    // ...
  }
});
```
