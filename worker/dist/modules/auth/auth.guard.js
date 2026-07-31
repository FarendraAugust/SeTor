import { verify } from 'hono/jwt';
import { env } from '../../config/env.js';
export const authGuard = async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer '))
        return c.json({ error: 'unauthorized' }, 401);
    const token = header.slice(7);
    if (token === env.internalToken)
        return next();
    try {
        const payload = await verify(token, env.jwtSecret, 'HS256');
        c.set('userId', payload.sub);
        c.set('userEmail', payload.email);
        return next();
    }
    catch {
        return c.json({ error: 'unauthorized' }, 401);
    }
};
