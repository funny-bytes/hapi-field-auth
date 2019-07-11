# hapi-field-auth

Hapi plugin for field-level authorization.

[![Build Status](https://travis-ci.org/frankthelen/hapi-field-auth.svg?branch=master)](https://travis-ci.org/frankthelen/hapi-field-auth)
[![Coverage Status](https://coveralls.io/repos/github/frankthelen/hapi-field-auth/badge.svg?branch=master)](https://coveralls.io/github/frankthelen/hapi-field-auth?branch=master)
[![Dependencies Status](https://david-dm.org/frankthelen/hapi-field-auth.svg)](https://david-dm.org/frankthelen/hapi-field-auth)
[![Greenkeeper badge](https://badges.greenkeeper.io/frankthelen/hapi-field-auth.svg)](https://greenkeeper.io/)
[![Maintainability](https://api.codeclimate.com/v1/badges/9a28b9cc8e829ae17a80/maintainability)](https://codeclimate.com/github/frankthelen/hapi-field-auth/maintainability)
[![node](https://img.shields.io/node/v/hapi-field-auth.svg)]()
[![code style](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)
[![License Status](http://img.shields.io/npm/l/hapi-field-auth.svg)]()

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
        validate: Joi.date().min('now').allow(null), // ...OR additional validation -> HTTP 400
      }],
    },
  },
  handler: function (request, h) {
    // ...
  }
});
```
