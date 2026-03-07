# Claude Instructions

## 1. Git Workflow (Strict — applies to all developers)

- Never commit or push directly to `main` or `master`.
- Before any commit, run `git branch` to confirm the active branch.
- If on `main` or `master`: stop and ask the user to create a dedicated branch before proceeding.
- Branch naming: `feature/<short-description>` or `fix/<short-description>`.
- When a task is complete, push the active branch and remind the user to open a Pull Request for review. Do not merge it yourself.

## 2. Task Planning (Flexible — developer specific)

Developers on this project have different workflows. Adapt accordingly:

- **GSD methodology (`.planning/` folder)**: If the user works with the `.planning/` folder, read those files at the start of each session to restore context, and keep them updated as work progresses. Key files: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`.
- **Other workflows**: If the user does not use the `.planning/` folder, follow their specific instructions and workflow. Do not create or reference the `.planning/` folder unless explicitly asked.

When in doubt about which workflow a user follows, ask — do not assume.

## 3. Code Consistency (Applies to all developers)

Regardless of planning method, always ensure any changes adhere to the existing project architecture, patterns, and tech stack. Read relevant source files before modifying them.
