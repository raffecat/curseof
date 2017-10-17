import eslint from 'rollup-plugin-eslint';
import buble from 'rollup-plugin-buble';

// Doesn't match the docs (old format?)
export default {
  entry: 'src/start.js',
  dest: 'gen/game.js',
  format: 'iife',
  plugins: [
    eslint({}),
    buble()
  ]
};
