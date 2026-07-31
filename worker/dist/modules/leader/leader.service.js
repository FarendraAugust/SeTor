import { eq, lt } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { env } from '../../config/env.js';
import { workers } from './leader.schema.js';
const HEARTBEAT_INTERVAL = 15_000;
const LEADER_TIMEOUT = 30_000;
export const LeaderService = {
    async register() {
        const [existing] = await dbShared
            .select()
            .from(workers)
            .where(eq(workers.id, env.workerId));
        if (!existing) {
            await dbShared.insert(workers).values({
                id: env.workerId,
                host: env.host,
                port: env.port,
            });
        }
        else {
            await dbShared.update(workers)
                .set({ host: env.host, port: env.port, lastHeartbeat: new Date() })
                .where(eq(workers.id, env.workerId));
        }
        return this.elect();
    },
    async elect() {
        const deadline = new Date(Date.now() - LEADER_TIMEOUT);
        const [leader] = await dbShared
            .select()
            .from(workers)
            .where(eq(workers.isLeader, true))
            .limit(1);
        if (!leader || leader.lastHeartbeat < deadline) {
            await dbShared.update(workers)
                .set({ isLeader: false })
                .where(eq(workers.isLeader, true));
            await dbShared.update(workers)
                .set({
                isLeader: true,
                electedAt: new Date(),
                lastHeartbeat: new Date(),
            })
                .where(eq(workers.id, env.workerId));
        }
    },
    async heartbeat() {
        await dbShared.update(workers)
            .set({ lastHeartbeat: new Date() })
            .where(eq(workers.id, env.workerId));
        const [record] = await dbShared
            .select()
            .from(workers)
            .where(eq(workers.id, env.workerId));
        return { isLeader: record?.isLeader ?? false };
    },
    start() {
        this.register().then(() => {
            setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL);
            setInterval(() => this.elect(), LEADER_TIMEOUT);
        });
    },
};
