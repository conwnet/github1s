# Repository Discovery Snapshots

This Worker collects public repositories from GitHub Search on a schedule, stores complete JSON snapshots in Workers KV, and exposes a public endpoint for reading the latest snapshot.

## Preview collection locally

From the repository root, provide `GITHUB_TOKEN` in the process environment and run:

```bash
npm run discovery
```

The command writes `out/discovery/github/latest.json` using the same collection logic as the Worker. It does not publish to KV. It accepts no command-line arguments; edit [`src/collections.ts`](src/collections.ts) to change queries.

The collections cover new projects, recently updated projects with fewer stars, highly starred projects, and selected topics. Queries and per-collection limits are defined in that file; the collection names describe those filters rather than a measure of recent star growth.
