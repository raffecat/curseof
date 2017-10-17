import eslint from 'rollup-plugin-eslint';
import uglify from 'rollup-plugin-uglify';
import buble from 'rollup-plugin-buble';
import typescript from 'rollup-plugin-typescript2';

// Doesn't match the docs (old format?)
export default {
  entry: 'src/start.js',
  dest: 'gen/game.js',
  format: 'iife',
  plugins: [
    typescript(),
    eslint({}),
    buble(),
    uglify()
  ]
};
