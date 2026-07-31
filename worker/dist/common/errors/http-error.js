export class HttpError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
    static badRequest(msg = 'bad request') { return new HttpError(msg, 400); }
    static unauthorized(msg = 'unauthorized') { return new HttpError(msg, 401); }
    static notFound(msg = 'not found') { return new HttpError(msg, 404); }
    static conflict(msg = 'conflict') { return new HttpError(msg, 409); }
    static tooMany(msg = 'too many requests') { return new HttpError(msg, 429); }
    static internal(msg = 'internal server error') { return new HttpError(msg, 500); }
}
