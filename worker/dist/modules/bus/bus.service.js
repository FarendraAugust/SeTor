import postgres from 'postgres';
import { env } from '../../config/env.js';
class EventBus {
    sql;
    handlers = new Map();
    workerId = env.workerId;
    async connect() {
        this.sql = postgres(env.sharedDatabaseUrl);
    }
    async subscribe(channel, handler) {
        const set = this.handlers.get(channel) ?? new Set();
        set.add(handler);
        this.handlers.set(channel, set);
        if (set.size === 1) {
            await this.sql.listen(channel, (payload) => {
                const event = JSON.parse(payload);
                for (const fn of this.handlers.get(channel) ?? [])
                    fn(event);
            });
        }
    }
    unsubscribe(channel, handler) {
        const set = this.handlers.get(channel);
        if (!set)
            return;
        set.delete(handler);
        if (set.size === 0)
            this.handlers.delete(channel);
    }
    async emit(channel, type, data) {
        const event = { type, data, source: this.workerId, timestamp: Date.now() };
        await this.sql.notify(channel, JSON.stringify(event));
    }
    async disconnect() {
        await this.sql.end();
    }
}
export const bus = new EventBus();
