import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/practice.js',
  output: [
    {
      file: 'dist/practice.bundle.js',
      format: 'umd',
      name: 'PracticeMaker', // The global variable name for browsers
      sourcemap: true
    },
    {
      file: 'dist/practice.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    resolve()
  ]
};