import eslint from 'rollup-plugin-eslint';
import closure from 'rollup-plugin-closure-compiler-js';

// Doesn't match the docs (old format?)
export default {
  entry: 'src/start.js',
  dest: 'gen/game.js',
  format: 'iife',
  intro: '(function($){',
  outro: '})',
  plugins: [
    eslint({}),
    closure({
      env: 'BROWSER',
      languageIn: 'ECMASCRIPT6_STRICT',
      languageOut: 'ECMASCRIPT5',
      compilationLevel: 'ADVANCED',
      assumeFunctionWrapper: true
    })
  ]
};
