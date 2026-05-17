'use strict';

const path = require('path');

/**
 * When a file under "Aqueduct Platform/backend" imports using "@/" (e.g. @/config/config-base),
 * resolve it to the platform backend root. Game backend files keep "@/" -> game backend.
 */
function platformAliasResolver(platformBackendPath) {
  const normalizedPlatform = path.normalize(platformBackendPath);

  return function apply(resolver) {
    resolver.getHook('resolve').tapAsync('PlatformAliasPlugin', (request, resolveContext, callback) => {
      const spec = request.request;
      if (!spec || typeof spec !== 'string' || !spec.startsWith('@/')) {
        return callback();
      }
      const issuerPath = resolveContext.path || request.path || '';
      if (!path.normalize(issuerPath).includes(normalizedPlatform)) {
        return callback();
      }
      const subPath = spec.slice(2);
      const newRequest = path.join(platformBackendPath, subPath);
      const obj = { ...request, request: newRequest, path: platformBackendPath };
      resolver.doResolve(resolver.hooks.resolve, obj, null, resolveContext, callback);
    });
  };
}

module.exports = { platformAliasResolver };
