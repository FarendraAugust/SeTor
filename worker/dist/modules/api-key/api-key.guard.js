import { verify } from 'hono/jwt';
import { env } from '../../config/env.js';
import { ApiKeyService } from '../api-key/api-key.service.js';
export const apiKeyOrJwtGuard = async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer '))
        return c.json({ error: 'unauthorized' }, 401);
    const token = header.slice(7);
    if (token === env.internalToken)
        return next();
    try {
        await verify(token, env.jwtSecret, 'HS256');
        return next();
    }
    catch {
        const key = await ApiKeyService.verify(token);
        if (!key)
            return c.json({ error: 'unauthorized' }, 401);
        await ApiKeyService.update(key.id, { name: key.name, active: key.active });
        ApiKeyRepositoryTouch(key.id);
        return next();
    }
};
function ApiKeyRepositoryTouch(id) {
    void import('../api-key/api-key.repository.js').then((m) => m.ApiKeyRepository.touch(id));
}
