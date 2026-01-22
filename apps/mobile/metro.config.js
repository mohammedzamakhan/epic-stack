const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

// Add .po file extension support for Lingui
config.resolver.sourceExts.push('po')

// Add Lingui metro transformer
config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve('@lingui/metro-transformer/expo'),
}

module.exports = withUniwindConfig(config, {
	cssEntryFile: './app/global.css',
	dtsFile: './uniwind-env.d.ts',
})
