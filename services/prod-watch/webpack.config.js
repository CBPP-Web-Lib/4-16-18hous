var path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    app: './src/app.js',
    worker_project: './src/worker_project.js'
  },
  watch: true,
  output: {
    path: path.resolve(__dirname, 'prod'),
    filename: '[name].js'
  },
  resolve: {
    fallback: { "stream": false }
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader'
        ]
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader'
        ],
      },
      {
        test: /\.html$/,
        loader: "raw-loader"
      },
      {
        test: /\.txt$/,
        loader: "raw-loader"
      }
    ],
  }
};