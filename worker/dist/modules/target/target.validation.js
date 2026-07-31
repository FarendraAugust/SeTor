import { HttpError } from '../../common/errors/http-error.js';
const MONITOR_TYPES = ['http', 'ping', 'tcp', 'dns', 'keyword', 'websocket', 'json-query', 'push', 'steam', 'docker'];
const URL_TYPES = ['http', 'keyword', 'json-query', 'websocket'];
const TLS_TYPES = ['http', 'keyword', 'websocket'];
function generatePushToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'pt-';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}
export function validateTarget(input) {
    const name = input.name?.trim();
    const url = input.url?.trim();
    const type = (input.type ?? 'http');
    if (!name)
        throw HttpError.badRequest('name is required');
    if (!url)
        throw HttpError.badRequest('url is required');
    if (!MONITOR_TYPES.includes(type)) {
        throw HttpError.badRequest(`invalid type, must be one of: ${MONITOR_TYPES.join(', ')}`);
    }
    if (URL_TYPES.includes(type)) {
        try {
            new URL(url);
        }
        catch {
            throw HttpError.badRequest(`invalid ${type} url format`);
        }
    }
    if (input.interval !== undefined && (input.interval < 5 || input.interval > 86400)) {
        throw HttpError.badRequest('interval must be between 5 and 86400 seconds');
    }
    if (input.timeout !== undefined && (input.timeout < 1 || input.timeout > 300)) {
        throw HttpError.badRequest('timeout must be between 1 and 300 seconds');
    }
    if (input.retries !== undefined && (input.retries < 0 || input.retries > 10)) {
        throw HttpError.badRequest('retries must be between 0 and 10');
    }
    if (input.maxRedirects !== undefined && (input.maxRedirects < 0 || input.maxRedirects > 20)) {
        throw HttpError.badRequest('maxRedirects must be between 0 and 20');
    }
    let notificationThreshold = null;
    if (input.notificationThreshold !== undefined && input.notificationThreshold !== null) {
        notificationThreshold = Number(input.notificationThreshold);
        if (!Number.isFinite(notificationThreshold) || notificationThreshold < 0) {
            throw HttpError.badRequest('notificationThreshold must be a non-negative number');
        }
    }
    const out = {
        name,
        url,
        type,
        method: input.method?.toUpperCase() || 'GET',
        interval: input.interval ?? 60,
        timeout: input.timeout ?? 30,
        retries: input.retries ?? 0,
        tags: input.tags ?? [],
        enabled: input.enabled ?? true,
        maxRedirects: input.maxRedirects ?? 10,
        ignoreTls: TLS_TYPES.includes(type) ? (input.ignoreTls ?? false) : false,
        upsideDown: input.upsideDown ?? false,
        description: input.description?.trim() || null,
        notificationIds: input.notificationIds ?? [],
        dockerContainer: type === 'docker' ? (input.dockerContainer ?? url) : null,
        pushToken: type === 'push' ? (input.pushToken ?? generatePushToken()) : null,
        steamGameId: type === 'steam' ? (input.steamGameId ?? null) : null,
        jsonQuery: type === 'json-query' ? (input.jsonQuery ?? null) : null,
        expectedValue: type === 'keyword' || type === 'json-query' ? (input.expectedValue ?? null) : null,
        proxyId: input.proxyId ?? null,
        resendNotification: input.resendNotification ?? false,
        notificationInterval: input.notificationInterval ?? null,
        notificationThreshold,
    };
    if (type === 'keyword' && !out.expectedValue) {
        throw HttpError.badRequest('expectedValue is required for keyword monitors');
    }
    return out;
}
