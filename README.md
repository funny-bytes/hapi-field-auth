# hapi-field-auth

Hapi plug-in for field-level authorization.

[![build status](https://img.shields.io/travis/frankthelen/hapi-field-auth.svg)](http://travis-ci.org/frankthelen/hapi-field-auth)
[![Coverage Status](https://coveralls.io/repos/github/frankthelen/hapi-field-auth/badge.svg?branch=master)](https://coveralls.io/github/frankthelen/hapi-field-auth?branch=master)
[![dependencies Status](https://david-dm.org/frankthelen/hapi-field-auth.svg)](https://david-dm.org/frankthelen/hapi-field-auth)
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

This plug-in adds field-level authorization to Hapi routes.

It makes sense particularly for *PATCH* routes
if the request payload contains fields that have special constraints
in respect to `scope` or `role` of the authenticated user.

A prerequisite for this plug-in is authentication -- use any authentication plug-in, e.g., `hapi-auth-basic`.
Authentication typically adds `request.route.auth.credentials` with properties `scope` or `role` to the route object.

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
  await server.register({
    plugin: hapiFieldAuth,
  });
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
        scope: ['write', 'write.extended'],
      },
    },
    validate: {
      payload: ExampleSchema, // Joi schema validation -> HTTP 400
    },
    plugins: {
      'hapi-field-auth': [{ // field-level authorization -> HTTP 403
        fields: ['myProtectedField'],
        scope: ['write.extended'],
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
