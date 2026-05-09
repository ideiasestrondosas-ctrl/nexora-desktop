## karpathy_guidelines

Rules:
- **Think Before Coding**: Surface tradeoffs, ask clarifying questions if ambiguous.
- **Simplicity First**: Write minimum code needed. If 200 lines can be 50, rewrite it.
- **Surgical Changes**: Touch ONLY what is requested. Remove orphaned imports/functions.
- **Goal-Driven**: Define verifiable success criteria before implementing. Run verification before proceeding.

Nexora Desktop specific:
- Before a worker: define "done" (esbuild compiles, cargo check passes)
- Before a Tauri Command: write TypeScript type signature first, then Rust
- Before a React component: define props interface and expected behaviour
- When unsure about FFmpeg params: reference `C:\Dev\Nexora Media Processing\src\workers\`
