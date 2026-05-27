# Architecture

This repository is currently a docs-first scaffold for agent work.

## High-Level Layout

- `AGENTS.md` is the entry point for future agents.
- `DEVELOPMENT.md` explains how to set up the local environment.
- `.docs/conventions/README.md` captures coding and development conventions.
- `.docs/architecture.md` explains the repository shape and how the docs fit together.
- `.agents/` holds task-specific skills such as reflection, setup, or other reusable workflows.

## Current Shape

- The repo does not yet have a full application runtime.
- The main value today is shared process knowledge: where to look, how to work, and what to preserve.
- As the codebase grows, this file should expand to describe the real runtime, major modules, data flow, and integration points.

## Intended Future Structure

- Product code can live alongside the docs and skills once the application exists.
- Any time a new subsystem appears, add a short architectural note here and update `AGENTS.md` with the new location.
