const path = require("path");

module.exports = {
	entry: './index.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'kvapi.js',
		library: 'kvapi',
		libraryExport: 'default',
		libraryTarget: 'umd',
		globalObject: 'this'
	},
	externals: {
		'node-fetch': {
			commonjs: 'node-fetch',
			commonjs2: 'node-fetch',
			amd: 'node-fetch',
			root: '_',
		},
		'form-data': {
			commonjs: 'form-data',
			commonjs2: 'form-data',
			amd: 'form-data',
			root: '_',
		}
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
						plugins: [
							"@babel/plugin-proposal-class-properties",
							"@babel/plugin-proposal-private-methods",
							"minify-mangle-names"
						]
					}
				}
			}
		]
	}
};
