# Development

This repository is a lightweight Vite/React scaffold with the LangGraph package installed.

This file is for humans setting up and working in the local development environment.

## Local Setup

- Install dependencies with `npm install`.
- Start the dev server with `npm run dev`.
- Build production assets with `npm run build`.
- Review `AGENTS.md` and `.docs/conventions/README.md` before making changes.

## What To Document Here

- Required language/runtime versions: Node.js `20.19+` or `22.12+`.
- Dependency installation steps: `npm install`.
- Environment variables and secrets: none required yet.
- Start, test, lint, and format commands:
  - `npm run dev`
  - `npm run build`
  - `npm run test`
  - `npm run lint`
  - `npm run format`
  - `npm run preview`
- Any platform-specific setup notes: the app uses the `@` alias for absolute imports within `src/`.

## Keep This Current

When a new developer or agent workflow is introduced, capture it here instead of burying it in chat history or commit messages.
