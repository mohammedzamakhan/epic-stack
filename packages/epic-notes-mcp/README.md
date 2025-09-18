# Epic Startup MCP

Model Context Protocol server for Epic Startup organization.

## Installation

Install globally:

```bash
npm install -g epic-notes-mcp
```

Or use directly with npx (recommended):

```bash
npx epic-notes-mcp <your-api-key>
```

## Usage

The package requires an API key as the first argument:

```bash
# If installed globally
epic-notes-mcp epic_your_api_key_here

# Or with npx
npx epic-notes-mcp epic_your_api_key_here
```

## Available Tools

- `find_user`: Search for users in your organization by name or username
- `get_user_notes`: Get notes for a specific user

## MCP Configuration

Add this to your `.kiro/settings/mcp.json`:

```json
{
	"mcpServers": {
		"epic-notes-test-organization": {
			"command": "npx",
			"args": ["epic-notes-mcp", "your-api-key-here"],
			"disabled": false,
			"autoApprove": ["find_user", "get_user_notes"]
		}
	}
}
```

## Development

To build the package:

```bash
npm install
npm run build
```

The built executable will be in the `build/` directory (which is git-ignored).

## Publishing

To publish this package:

1. Update the version in `package.json`
2. Update the repository URLs in `package.json` to match your actual repository
3. Run `npm run build` to create the bundled executable in `build/`
4. Run `npm publish` from the package directory

The package is built as a single bundled executable with no runtime
dependencies. The `build/` folder is excluded from git but included in the npm
package.

## Requirements

- Node.js >= 18.0.0
- Valid Epic Startup API key
