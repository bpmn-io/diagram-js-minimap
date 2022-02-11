import semver from 'semver';

export * from 'diagram-js/test/helper';

/**
 * Execute test only if currently installed bpmn-js is of given version.
 *
 * @param {string} versionRange
 * @param {boolean} only
 */
export function withDiagramJs(versionRange, only) {
  if (diagramJsSatisfies(versionRange)) {
    return only ? it.only : it;
  } else {
    return it.skip;
  }
}

function diagramJsSatisfies(versionRange) {
  var bpmnJsVersion = require('diagram-js/package.json').version;

  return semver.satisfies(bpmnJsVersion, versionRange, { includePrerelease: true });
}

