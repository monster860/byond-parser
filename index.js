'use strict';

let ByondEnv = require('./lib/environment.js');
let parse = require('./lib/parser.js');

ByondEnv.parse = parse;

module.exports = ByondEnv;
