const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

// Monorepo-aware Metro config so Expo can resolve workspace packages from
// the repo root, not just apps/mobile/node_modules. (CLAUDE.md §3.)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
