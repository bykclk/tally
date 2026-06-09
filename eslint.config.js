// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // dist/* is build output; tools/* are ad-hoc Node build scripts (e.g. icon
    // generation) that aren't part of the app and use Node globals/deps.
    ignores: ["dist/*", "tools/*"],
  }
]);
