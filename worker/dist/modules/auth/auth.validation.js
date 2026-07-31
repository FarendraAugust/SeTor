import { HttpError } from '../../common/errors/http-error.js';
export function validateRegister(input) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    if (!name)
        throw HttpError.badRequest('name is required');
    if (!email)
        throw HttpError.badRequest('email is required');
    if (!email.includes('@'))
        throw HttpError.badRequest('invalid email format');
    if (!password || password.length < 8)
        throw HttpError.badRequest('password must be at least 8 characters');
    return { name, email, password };
}
export function validateLogin(input) {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    if (!email)
        throw HttpError.badRequest('email is required');
    if (!password)
        throw HttpError.badRequest('password is required');
    return { email, password };
}
