const presets = [
  [
    '@babel/env',
    {
      targets: { node: '10' },
    },
  ],
  '@babel/flow',
];

const plugins = [];

module.exports = { presets, plugins };
