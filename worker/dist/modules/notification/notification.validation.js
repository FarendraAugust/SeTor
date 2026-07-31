import { HttpError } from '../../common/errors/http-error.js';
export function validateNotification(input) {
    const name = input.name?.trim();
    const type = input.type?.trim();
    if (!name)
        throw HttpError.badRequest('name is required');
    if (!type)
        throw HttpError.badRequest('type is required');
    return {
        name,
        type,
        config: input.config ?? {},
        active: input.active ?? true,
        applyTo: input.applyTo ?? [],
        customMessage: input.customMessage?.trim() || null,
    };
}
