import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  // Primary build: q-loader
  {
    input: 'src/q-loader.js',
    output: [
      {
        file: 'dist/q-loader.bundle.js',
        format: 'umd',
        name: 'QuestionLoader',
        exports: 'default', // <--- Change 'named' to 'default'
        sourcemap: true
      },
      {
        file: 'dist/q-loader.esm.js',
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
  },
  // Secondary build: practice
  {
    input: 'src/practice.js',
    output: [
      {
        file: 'dist/practice.bundle.js',
        format: 'umd',
        name: 'PracticeMaker',
        exports: 'named',
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
  }
];