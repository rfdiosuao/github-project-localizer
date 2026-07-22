<div align="center">

<a href="README.md">简体中文</a> · <strong>English</strong>

# 🌐 GitHub Project Localizer

**AI-assisted localization for open-source projects.**

Scan a codebase, identify user-facing text, estimate translation cost, and generate reviewable localization resources.

</div>

## Features

- Finds UI strings, code comments, Markdown, and JSON content
- Generates non-invasive `locales/zh-CN.json` mappings by default
- Supports inline replacement when explicitly selected and reviewed
- Works with OpenAI, Anthropic, DeepSeek, and compatible local endpoints
- Estimates token usage and model cost before translation
- Provides a Vue-based interface for progress, preview, and review

## Architecture

- **Web UI:** Vue 3
- **API:** Express
- **Core:** scanner, extractor, translator, and mapping generator
- **Storage:** SQLite project state and task records
- **Model layer:** provider adapters and custom compatible endpoints

## Quick Start

Requirements: Node.js 18+ and npm.

```bash
git clone https://github.com/rfdiosuao/github-project-localizer.git
cd github-project-localizer
npm install
```

Configure model credentials through environment variables or the documented local configuration. Never commit real API keys.

Run the development services using the scripts defined in [`package.json`](package.json), then add a project, scan it, choose a model, review the estimate, and start translation.

## Safety Principles

- Prefer mapping files over direct source rewrites.
- Keep source control clean and review every generated change.
- Exclude secrets, dependencies, build output, and binary assets from scans.
- Validate translated output with the project's normal tests before release.

## Contributing

Issues and pull requests are welcome. Include reproducible input, expected output, and provider details without exposing credentials.

## License

The original project README declares MIT licensing. Verify the repository's current license information before redistribution.
