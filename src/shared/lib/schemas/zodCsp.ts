import { z } from "zod";

// Configure Zod before any schema module is evaluated. Strict CSP blocks the
// optional JIT probe otherwise, even though Zod catches the failed eval.
z.config({ jitless: true });
