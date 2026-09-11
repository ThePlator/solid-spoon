// Metro config for an Expo app inside an npm-workspaces monorepo.
// Resolves @supermind/core + firebase from the repo-root node_modules.
// On SDK 57, Metro's package-exports support is on by default and Firebase 11
// resolves correctly with it — so we leave it enabled (disabling it here was an
// older workaround that now breaks Firebase auth registration).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
