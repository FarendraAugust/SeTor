import { verify } from 'hono/jwt';
import { config } from '../config.js';
export const auth = async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer '))
        return c.json({ error: 'unauthorized' }, 401);
    try {
        const payload = await verify(header.slice(7), config.jwtSecret, 'HS256');
        c.set('user', { id: payload.sub, email: payload.email });
        return next();
    }
    catch {
        return c.json({ error: 'unauthorized' }, 401);
    }
};
