## simple-coding-agent

A minimal, coding agent that uses OpenAI's Responses API with function tools to read, list, and edit files in your workspace.

### Features
- **OpenAI Responses loop**: tool-augmented reasoning with function calling.
- **Tools included**: `read_file`, `list_dir`, `edit_file` (overwrite, append, replace).
- **TypeScript**: strict config, build to `dist/`.

### Prerequisites
- **Node.js**: v18+ (v20 recommended).
- **npm**: v8+.
- An OpenAI API key

## Roadmap / TODOs
  - Add `glob_search` for pattern-based file discovery
  - Add `grep_search` for content regex search
  - Add `run_command` (careful: sandbox and allowlist)
  - Stream assistant tokens and tool progress updates
  - Add colored output and improved formatting for tool results
  - block editing outside the workspace
  - Better error handling
  - Packaging

## License
MIT
