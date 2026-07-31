import { desc, sql, eq, and, gte } from 'drizzle-orm';
import { dbLocal } from '../../database/local.js';
import { monitoring } from './monitor.schema.js';
export const MonitorRepository = {
    insert(data) {
        return dbLocal.insert(monitoring).values(data).then(() => { });
    },
    recent(limit = 50) {
        return dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt)).limit(limit);
    },
    count() {
        return dbLocal.select({ count: sql `count(*)` }).from(monitoring).then((r) => r[0]?.count ?? 0);
    },
    async stats() {
        const [total] = await dbLocal.select({ count: sql `count(*)::int` }).from(monitoring);
        const [up] = await dbLocal.select({ count: sql `count(*)::int` })
            .from(monitoring)
            .where(eq(monitoring.status, 'up'));
        const [avg] = await dbLocal.select({ avg: sql `avg(response_time)` })
            .from(monitoring)
            .where(eq(monitoring.status, 'up'));
        const [last] = await dbLocal.select({ checkedAt: monitoring.checkedAt })
            .from(monitoring)
            .orderBy(desc(monitoring.checkedAt))
            .limit(1);
        const totalCount = total?.count ?? 0;
        const upCount = up?.count ?? 0;
        return {
            total: totalCount,
            up: upCount,
            down: totalCount - upCount,
            avgResponseTime: avg?.avg ?? null,
            uptime: totalCount === 0 ? 0 : Math.round((upCount / totalCount) * 100),
            lastCheckedAt: last?.checkedAt ?? null,
        };
    },
    async latestByTarget() {
        const rows = await dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt));
        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.targetId)) {
                map.set(r.targetId, {
                    targetId: r.targetId,
                    targetName: r.targetName,
                    status: r.status,
                    responseTime: r.responseTime,
                    statusCode: r.statusCode,
                    lastCheckedAt: r.checkedAt,
                });
            }
        }
        return [...map.values()];
    },
    timeline(targetId, limit = 100) {
        return dbLocal.select()
            .from(monitoring)
            .where(eq(monitoring.targetId, targetId))
            .orderBy(desc(monitoring.checkedAt))
            .limit(limit);
    },
    latestByTargetId(targetId) {
        return dbLocal.select()
            .from(monitoring)
            .where(eq(monitoring.targetId, targetId))
            .orderBy(desc(monitoring.checkedAt))
            .limit(1)
            .then((r) => r[0]);
    },
    uptimeSince(targetId, since) {
        return dbLocal.select({
            total: sql `count(*)::int`,
            up: sql `count(*) FILTER (WHERE status = 'up')::int`,
        }).from(monitoring)
            .where(and(eq(monitoring.targetId, targetId), gte(monitoring.checkedAt, since)))
            .then((r) => ({ total: r[0]?.total ?? 0, up: r[0]?.up ?? 0 }));
    },
    removeByTarget(targetId) {
        return dbLocal.delete(monitoring).where(eq(monitoring.targetId, targetId)).then(() => { });
    },
    async perTargetStats() {
        const [latest, grouped] = await Promise.all([
            dbLocal.select().from(monitoring).orderBy(desc(monitoring.checkedAt)),
            dbLocal.select({
                targetId: monitoring.targetId,
                total: sql `count(*)::int`,
                up: sql `count(*) FILTER (WHERE status = 'up')::int`,
            }).from(monitoring).groupBy(monitoring.targetId),
        ]);
        const latestMap = new Map();
        for (const r of latest) {
            if (!latestMap.has(r.targetId))
                latestMap.set(r.targetId, r);
        }
        return grouped.map((g) => {
            const l = latestMap.get(g.targetId);
            return {
                targetId: g.targetId,
                status: l?.status ?? 'unknown',
                uptime: g.total === 0 ? 0 : Math.round((g.up / g.total) * 1000) / 10,
                responseTime: l?.responseTime ?? null,
                lastCheckedAt: l?.checkedAt ?? new Date(0),
            };
        });
    },
};
