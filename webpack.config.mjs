import CompressionWebpackPlugin from 'compression-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import DotenvPlugin from 'dotenv-webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';

const {
  EnvironmentPlugin,
  HotModuleReplacementPlugin,
  NoEmitOnErrorsPlugin,
  ProvidePlugin
} = webpack;

const PORT = process.env.PORT || 8080;

export default function ({ production, WEBPACK_WATCH }) {
  const mode = production ? 'production' : 'development';
  const devtool = production ? false : 'inline-source-map';

  return {
    entry: path.resolve('src/index.ts'),
    target: 'web',
    mode,
    devtool,
    stats: 'errors-only',
    bail: WEBPACK_WATCH ? false : true,
    output: {
      crossOriginLoading: 'anonymous',
      filename: '[name].js',
      path: path.resolve('dist'),
      sourceMapFilename: '[file].map',
      libraryTarget: 'umd',
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.(js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true
            }
          }
        },
        {
          test: /\.(ico|png|jpg|jpeg|gif|webp|env|glb|stl)$/i,
          use: {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        }
      ]
    },
    performance: {
      hints: false
    },
    optimization: {
      minimize: production ? true : false
    },
    watchOptions: {
      aggregateTimeout: 300,
      poll: 300,
      ignored: /node_modules/
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'assets' }
        ]
      }),
      new NoEmitOnErrorsPlugin(),
      new EnvironmentPlugin({
        NODE_ENV: mode
      }),
      new DotenvPlugin(),
      new ProvidePlugin({
        CANNON: 'cannon'
      }),
      new HtmlWebpackPlugin({
        title: 'Playlist Browser XR',
        template: path.resolve('public/index.html'),
        favicon: path.resolve('public/favicon.png')
      }),
      ...production ? [
        new CompressionWebpackPlugin()
      ] : [
        new HotModuleReplacementPlugin()
      ]
    ],
    devServer: {
      watchContentBase: true,
      open: true,
      quiet: true,
      port: PORT,
      publicPath: `http://localhost:${PORT}`,
      noInfo: true,
      compress: true,
      hot: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
      disableHostCheck: true,
      stats: 'errors-only',
      watchOptions: {
        poll: 300
      },

      // enable access from other devices on the network
      useLocalIp: true,
      host: '0.0.0.0',

      // if you aren’t using ngrok, and want to connect locally, WebXR requires HTTPS
      // https: true,
    },
  };
};
