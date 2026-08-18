const util = require('node:util');
if (!util.styleText) {
  util.styleText = (_style, text) => text;
}
