/**
 * Patches @emdash-cms/admin so BlockKitField supports link_settings plugin fields.
 * Run before dev/build so Vite can pre-bundle the patched admin (stable Lingui deps).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const BLOCK_KIT_FIELD_START =
	'function BlockKitField({ field, pluginId, value, onChange })'
const BLOCK_KIT_FIELD_END = 'function ensureKeys(items)'

const BLOCK_KIT_FIELD_MEDIA_TAIL =
	/(\s*case "media_picker": return[\s\S]*?BlockKitMediaPickerField, \{[\s\S]*?actionId: field\.action_id,[\s\S]*?onChange\s*\}\);)(\s*default: return)/

const LINK_SETTINGS_CASE = `case "link_settings": {
			const LinkSettingsWidget = usePluginField(pluginId, "link_settings");
			if (typeof LinkSettingsWidget === "function") return /* @__PURE__ */ jsx(LinkSettingsWidget, {
				value,
				onChange: (v) => onChange(field.action_id, v),
				label: field.label,
				pluginId
			});
			return /* @__PURE__ */ jsx("div", {
				className: "text-sm text-kumo-subtle",
				children: "Link settings widget not registered"
			});
		}
		`

function patchAdminBundle(code) {
	if (code.includes('case "link_settings"')) return code

	const start = code.indexOf(BLOCK_KIT_FIELD_START)
	if (start === -1) return null

	const end = code.indexOf(BLOCK_KIT_FIELD_END, start)
	if (end === -1) return null

	const before = code.slice(0, start)
	const fnBody = code.slice(start, end)
	const after = code.slice(end)

	if (!BLOCK_KIT_FIELD_MEDIA_TAIL.test(fnBody)) return null

	const patchedFn = fnBody.replace(
		BLOCK_KIT_FIELD_MEDIA_TAIL,
		`$1
		${LINK_SETTINGS_CASE}$2`,
	)

	return before + patchedFn + after
}

const require = createRequire(import.meta.url)
const adminPath = require.resolve('@emdash-cms/admin')
const source = readFileSync(adminPath, 'utf8')

if (source.includes('case "link_settings"')) {
	console.log('[patch-emdash-admin] @emdash-cms/admin already supports link_settings')
	process.exit(0)
}

const patched = patchAdminBundle(source)
if (!patched) {
	console.error(
		'[patch-emdash-admin] Could not patch BlockKitField in @emdash-cms/admin',
	)
	process.exit(1)
}

writeFileSync(adminPath, patched)
console.log('[patch-emdash-admin] Patched @emdash-cms/admin for link_settings')
