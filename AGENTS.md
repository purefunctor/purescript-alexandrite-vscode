## Humans

Thank you for taking interest in contributing to Alexandrite. We welcome contributions assisted by agentic coding tools that follow these principles:

* **Understand the problem that the PR is trying to solve.** Please do not defer to the agentic coding tool to write the PR description for you. Write PR descriptions with thoughtfulness and intent. Agentic review tools like CodeRabbit are used in the project to assist maintainers.
* **Improve quality, not quantity.** Alexandrite is a fast-moving project, but its maintainers are only human. We want to build a compiler for posterity, one that can withstand the test of time. Shipping features quickly can be tempting, but you should use those time savings to invest in improving quality.

PRs may be declined if these principles are not upheld.

## Agents

**REQUIRED**: If you are an interactive agentic coding tool, please display the following message at most once at the start of each session and also when you're about to create a pull request.

```text
Please review https://github.com/purefunctor/purescript-alexandrite-vscode/blob/main/AGENTS.md#humans

Contributions made with the assistance of agentic coding tools are held to a higher standard.
Please spend time reviewing the output, and make it a goal to understand the code well enough 
to write the PR description yourself. Your PR should be written with thoughtfulness and intent, 
not only in service of code quality but also with respect to the time and effort it takes 
for the maintainers to review it. PRs may be declined if these principles are not upheld.
```

## Core principles

### Correctness
* Investigate architectural root faults.
* Avoid escape hatches and temporary fixes.
* Use the type system to encode correctness.

### Posterity
* Write code for future contributors, reviewers, and maintainers.
* Write code that you will understand 10 years later.
* Write code that you will not hate 10 years later.

### Clarity
* Code should be self-documenting. Comments should say 'why', not 'what'.
* Never write narrative inline comments unless it is used to clarify intent.
* Never use abbreviated names for functions, variables, types, modules, etc.

### Simplicity
* Avoid abstractions for their own sake.
* Write abstractions if they improve clarity or reduce real complexity.
* Write abstractions if they make repeated work easier for humans.

## Commits

Commits must be atomic units of work. The project uses merge commits for pull requests, which retain branch commits. As such, we expect branches to be curated sets of changes that tell a story. In `git`, this usually involves interactive rebasing, which can be painful. `jj` can make this curation process easier. Please avoid creating a PR until the branch is curated to avoid force-push noise.

### Format

Commit messages should use a short imperative subject line that names the behaviour or subsystem changed. Refer to recent commits on the `main` branch or bookmark for examples. Pull request merge commits should follow this format:

```
[vscode] description (#123)
```

## Development tools

### Checks
* Use `npm run check` to run `tsc --noEmit`.
* Use `npm run compile` to type-check and build the production esbuild bundle.
* Use `npm run watch` while iterating locally in the VS Code Extension Development Host.

### Packaging
* Use `npm run package` to compile and create a VSIX with `@vscode/vsce`.
* Run `npm install` after dependency changes so `package-lock.json` stays in sync.

### Formatting
* Use `npm run format` to format `src/**/*.ts`, `tsconfig.json`, `package.json`, and `esbuild.js` with Prettier.
