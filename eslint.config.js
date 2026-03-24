const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
	{
		ignores: ['css/**', 'img/**', 'sass/**', 'trash/**'],
	},
	js.configs.recommended,
	{
		files: ['js/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: {
				...globals.browser,
				...globals.es2021,
				AppUtils: 'readonly',
				XLSX: 'readonly',
				webkitAudioContext: 'readonly',
			},
		},
		rules: {
			'no-alert': 'off',
			'no-unused-vars': [
				'warn',
				{
					args: 'none',
					ignoreRestSiblings: true,
				},
			],
		},
	},
]
