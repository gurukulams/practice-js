import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/practice.js',
  output: [
    {
      file: 'dist/practice.bundle.js',
      format: 'umd',
      name: 'PracticeMaker',
      sourcemap: true
    },
    {
      file: 'dist/practice.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ]
};