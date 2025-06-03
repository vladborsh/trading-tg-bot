const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/main.ts',
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/bot': path.resolve(__dirname, 'src/bot'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/data': path.resolve(__dirname, 'src/data'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/backtesting': path.resolve(__dirname, 'src/backtesting'),
    },
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  devtool: 'source-map',
};
