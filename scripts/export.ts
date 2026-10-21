#!/usr/bin/env node
import { main } from '../src/cli/main.ts';

main().catch((error: unknown) => {
  console.error(`Export fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
