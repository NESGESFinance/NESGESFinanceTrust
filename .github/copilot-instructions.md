# Copilot repository instructions

- For tasks that involve `frontend/assets/img` or other binary assets, do **not** call image-preview tooling (`view` on `.png/.jpg/.jpeg/.webp/.gif`) for generated files under `/tmp`.
- Prefer text-safe inspection (`glob`, `rg`, `bash` with `file`/`identify`) and integrate assets based on filename semantics and existing page context.
- Avoid generating contact sheets or synthetic image previews unless explicitly requested.
