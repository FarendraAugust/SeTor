const store = new Map();
export function rateLimit(max, windowMs) {
    return async (c, next) => {
        const key = c.req.header('x-forwarded-for') ?? 'local';
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || entry.resetAt < now) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (entry.count >= max) {
            return c.json({ error: 'too many requests' }, 429);
        }
        entry.count++;
        return next();
    };
}
