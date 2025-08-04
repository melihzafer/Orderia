const babel = require('@babel/core');

module.exports = function() {
  return {
    name: 'transform-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          // Replace import.meta with a safe object for web
          path.replaceWithSourceString('({ url: window.location.href })');
        }
      },
    },
  };
};
