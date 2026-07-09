'use strict';

const build = require('@microsoft/sp-build-web');

build.addSuppression(/Warning - [sass] The local CSS class/gi);
build.initialize(require('gulp'));
