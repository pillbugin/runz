# 🆁🆄🅽🆉

⏳ **WIP**: Currently, only macOS is supported.


**Runz** is a simple utility designed to help developers run multiple commands simultaneously, simplifying workflows for applications that depend on several services or scripts running in parallel.

It opens a window with multiple tabs — one for each command — plus a dedicated tab that consolidates the logs from all commands in one place. Each command can also be started or stopped individually through the interface.

@TODO: GIF Example

---

## Features ✨

- 🧵 Run multiple commands at once
- 🪟 GUI window with one tab per command
- 📜 Global log tab combining all outputs
- 🛑▶️ Start/stop individual commands
- ⚙️ Configuration via CLI or config file (YAML/JSON)

---

## Installing 🧪

### Using npx, pnpx, bunx...

You can use Runz directly with `npx` or a similar tool (no installation required):

```sh
npx runz
```

### Pré-built Executables 💾

You can also download prebuilt executables to use Runz without using Node.js. Visit the [Releases](https://github.com/pillbugin/runz/releases) section of this repository to get the latest version for your OS.

### Build from Source 🛠️

To build Runz from source, you'll need Rust and Bun installed. Clone the repository and run:

```sh
(cd frontend && bun install && bun run build)
cargo build --release
```

This will create a `target/release/runz` built executable. You can now run it directly:

```sh
./target/release/runz
```

---

## Using a Config File 🗂️

You can use a config file instead of passing commands through the CLI.

Runz supports:
- `runz.config.yaml`
- `runz.config.yml`
- `runz.config.json`
- `runz.config.jsonc`
- `runz.config.toml`

By default, it looks for one of these files in the current working directory. You can also explicitly specify the file path:

```sh
# You can also use the shorthand -c
npx runz --config ./my-config.yaml
```

Optionally, you can pass the config file as string from the command line

```sh
# You can also use the shorthand -r
npx runz --raw-config json|'{"name":"My Workspace","services":[{"name":"API Server","wdir":"./apps/api","prog":"go","args":["run","main.go"]},{"name":"Queue Worker","wdir":"./apps/queue","prog":"node","args":["worker.js"]},{"name":"Web App","wdir":"./apps/web","prog":"npm","args":["run","dev"]}]}'"
```

#### Configuration Format 🧾

- `name`: *(required)*: A name to identify the workspace
- `services`: *(required)*: The programs/commands to run
  - `name`: *(optional)*: A name to identify the service
  - `wdir`: *(optional)*: The working directory for the program/command
  - `prog`: *(required)*: The programs to run
  - `args`: *(optional)*: A list of arguments to pass to the program/command.

Example (YAML):

```yaml
name: My Workspace
services:
  - name: API Server
    wdir: ./apps/api
    prog: go
    args:
      - run
      - main.go

  - name: Queue Worker
    wdir: ./apps/queue
    prog: node
    args:
      - worker.js

  - name: Web App
    wdir: ./apps/web
    prog: npm
    args:
      - run
      - dev
```

The order of the array determines the order of the tabs.

---

## Troubleshooting
- ***“No config provided”***\
Make sure you passed --config runz.yml, have RUNZ_CONFIG env var set, or a runz.yml exists in CWD.

---

## License 📄

MIT License
