# hapi-field-auth

Hapi plugin for field-level authorization.

[![build status](https://img.shields.io/travis/frankthelen/hapi-field-auth.svg)](http://travis-ci.org/frankthelen/hapi-field-auth)
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
for Hapi routes -- particularly for *PATCH* routes.
If the request payload has fields with special constraints
in respect to the `scope` of the authenticated user,
this plugin allows to restrict access on field-level.

A prerequisite is authentication -- use any authentication plugin, e.g., `hapi-auth-basic`.
It is expected that authentication sets `request.route.auth.credentials.scope`
to the request object.

Dynamic scopes referring to the request object (query, params, payload, and credentials)
are supported, e.g., `user-{params.id}`. Prefix characters `!` and `+` are not (yet) supported.

## Usage

Register the plugin with Hapi server like this:
```js
const Hapi = require('hapi');
const hapiAuthBasic = require('hapi-auth-basic');
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
      access: {
        scope: ['write', 'write.extended'], // allow both scopes
      },
    },
    validate: {
      payload: ExampleSchema, // Joi schema validation -> HTTP 400
    },
    plugins: {
      'hapi-field-auth': [{ // field-level authorization -> HTTP 403
        fields: ['myProtectedField'], // request payload properties
        scope: ['write.extended'], // restrict to scope
      }],
    },
  },
  handler: function (request, h) {
    // ...
  }
});
```

## Options

This plugin does not have any options.
