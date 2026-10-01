import fs from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import eslint from '@rollup/plugin-eslint';
const common = {
  context: 'window',
  plugins: [
    resolve(),
    eslint({
      overrideConfigFile: './eslint.config.js',
    }),
    babel({
      babelHelpers: 'bundled',
      comments: false,
      sourceMaps: true,
      plugins: [
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        '@babel/plugin-proposal-optional-chaining',
        [
          'babel-plugin-transform-replace-expressions',
          {
            replace: {
              'globalThis.BARDETECTION_EDGE_RANGE': '32',
            },
          },
        ],
      ],
    }),

  ],
};

const scripts = [
  'background',
  'options',
  'content',
  'content-main',
  'injected',
  'live-chat',
];

export default scripts.map((script) =>
  Object.assign(
    {},
    {
      input: `./src/scripts/${script}.js`,
      output: {
        file: `./dist/scripts/${script}.js`,
        format: 'iife',
        sourcemap: true,
        intro: fs
          .readFileSync('./src/scripts/intros/console.js', 'utf8')
          .replaceAll(/.*\/\/ eslint-disable.*/g, ''),
      },
    },
    common
  )
);
