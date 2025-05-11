const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const copy = (src, dest) => {
  fse.copySync(src, dest, { overwrite: true });
};

copy('node_modules/bootstrap/dist/css/bootstrap.min.css', 'public/css/bootstrap.min.css');
copy('node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'public/js/bootstrap.bundle.min.js');
copy('node_modules/@fortawesome/fontawesome-free/css/all.min.css', 'public/css/all.min.css');
copy('node_modules/@fortawesome/fontawesome-free/webfonts', 'public/webfonts');
copy('node_modules/alpinejs/dist/cdn.min.js', 'public/js/alpine.min.js');
