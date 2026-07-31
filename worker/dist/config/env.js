function requireEnv(key, fallback) {
    const val = process.env[key] ?? fallback;
    if (!val)
        throw new Error(`Missing required env: ${key}`);
    return val;
}
function optional(key, def) {
    const val = process.env[key];
    return val ? val : def;
}
export const env = {
    port: parseInt(optional('PORT', '3001'), 10),
    host: optional('HOST', '0.0.0.0'),
    nodeEnv: optional('NODE_ENV', 'development'),
    logLevel: optional('LOG_LEVEL', 'info'),
    isProduction: process.env.NODE_ENV === 'production',
    sharedDatabaseUrl: requireEnv('DATABASE_URL'),
    localDatabaseUrl: optional('LOCAL_DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/worker_local'),
    jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
    internalToken: requireEnv('INTERNAL_TOKEN', 'dev-internal-token'),
    checkInterval: parseInt(optional('CHECK_INTERVAL', '60'), 10),
    corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim()),
    workerId: optional('WORKER_ID', crypto.randomUUID()),
};
