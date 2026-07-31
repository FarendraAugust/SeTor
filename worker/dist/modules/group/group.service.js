import { HttpError } from '../../common/errors/http-error.js';
import { GroupRepository } from './group.repository.js';
export function validateGroup(input) {
    const name = input.name?.trim();
    if (!name)
        throw HttpError.badRequest('name is required');
    return { name, monitors: input.monitors ?? [] };
}
export const GroupService = {
    async list() {
        return GroupRepository.findAll();
    },
    async get(id) {
        const g = await GroupRepository.findById(id);
        if (!g)
            throw HttpError.notFound('group not found');
        return g;
    },
    async create(input) {
        return GroupRepository.create(input);
    },
    async update(id, input) {
        await this.get(id);
        return GroupRepository.update(id, input);
    },
    async remove(id) {
        await this.get(id);
        await GroupRepository.remove(id);
    },
};
