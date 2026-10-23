type ZodGlobalConfig = { jitless?: boolean };

type GlobalWithZodConfig = typeof globalThis & {
  __zod_globalConfig?: ZodGlobalConfig;
};

// Set this before importing Zod so its optional JIT probe never runs under CSP.
const globalWithZodConfig = globalThis as GlobalWithZodConfig;
globalWithZodConfig.__zod_globalConfig ??= {};
globalWithZodConfig.__zod_globalConfig.jitless = true;
