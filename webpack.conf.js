import webpack from "webpack";
import path from "path";

export default {
  module: {
    rules: [
      {
        test: /\.((png)|(eot)|(woff)|(woff2)|(ttf)|(svg)|(gif))(\?v=\d+\.\d+\.\d+)?$/,
        use: "file?name=/[hash].[ext]"
      },
      {test: /\.json$/, use: "json-loader"},
      {
        use: "babel-loader",
        test: /\.js?$/,
        exclude: /node_modules/
      }
    ]
  },

  mode: 'none',

  plugins: [
    new webpack.ProvidePlugin({
      "fetch": "imports?this=>global!exports?global.fetch!whatwg-fetch"
    })
  ],

  context: path.join(__dirname, "src"),
  entry: {
    app: ["./js/app"]
  },
  output: {
    path: path.join(__dirname, "dist"),
    publicPath: "/",
    filename: "[name].js"
  },
  externals:  [/^vendor\/.+\.js$/]
};
