const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Optimization: Ignore heavy folders to reduce lag during development
      webpackConfig.watchOptions = {
        ignored: /node_modules|build|dist|.git/,
      };
      return webpackConfig;
    },
  },
  // This block fixes the WebSocket connection to port 443 errors
  devServer: (devServerConfig) => {
    devServerConfig.client = {
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3000,
      },
    };
    return devServerConfig;
  },
};