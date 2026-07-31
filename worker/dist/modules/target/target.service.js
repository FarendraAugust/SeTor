import { HttpError } from '../../common/errors/http-error.js';
import { TargetRepository } from './target.repository.js';
export const TargetService = {
    async list() {
        return TargetRepository.findAll();
    },
    async get(id) {
        const target = await TargetRepository.findById(id);
        if (!target)
            throw HttpError.notFound('target not found');
        return target;
    },
    async create(input) {
        return TargetRepository.create(input);
    },
    async update(id, input) {
        const existing = await TargetRepository.findById(id);
        if (!existing)
            throw HttpError.notFound('target not found');
        return TargetRepository.update(id, input);
    },
    async remove(id) {
        const existing = await TargetRepository.findById(id);
        if (!existing)
            throw HttpError.notFound('target not found');
        await TargetRepository.remove(id);
    },
};
