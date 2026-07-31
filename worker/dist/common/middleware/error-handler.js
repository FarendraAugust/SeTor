import { HttpError } from '../errors/http-error.js';
export const errorHandler = (err, c) => {
    if (err instanceof HttpError) {
        return c.json({ error: err.message }, err.statusCode);
    }
    console.error('[unhandled]', err);
    return c.json({ error: 'internal server error' }, 500);
};
