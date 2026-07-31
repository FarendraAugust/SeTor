import { MonitorService } from '../monitor/monitor.service.js';
import { NotificationRepository } from '../notification/notification.repository.js';
import { StatusPageRepository } from '../status-page/status-page.repository.js';
import { MaintenanceRepository } from '../maintenance/maintenance.repository.js';
import { GroupRepository } from '../group/group.repository.js';
import { ProxyRepository } from '../proxy/proxy.repository.js';
import { TargetRepository } from '../target/target.repository.js';
export const BackupService = {
    async export() {
        const [monitors, notifications, statusPages, maintenance, groups, proxies] = await Promise.all([
            MonitorService.monitors(true),
            NotificationRepository.findAll(),
            StatusPageRepository.findAll(),
            MaintenanceRepository.findAll(),
            GroupRepository.findAll(),
            ProxyRepository.findAll(),
        ]);
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            monitors,
            notifications,
            statusPages,
            maintenance,
            groups,
            proxies,
        };
    },
    async import(data) {
        if (!data || !Array.isArray(data.monitors)) {
            throw new Error('invalid backup: monitors array is required');
        }
        const existingTargets = await TargetRepository.findAll();
        for (const t of existingTargets) {
            await TargetRepository.remove(t.id);
        }
        for (const m of data.monitors) {
            if (!m.name || !m.url)
                continue;
            await TargetRepository.create({
                name: String(m.name),
                url: String(m.url),
                type: String(m.type ?? 'http'),
                method: String(m.method ?? 'GET'),
                interval: Number(m.interval ?? 60),
                timeout: Number(m.timeout ?? 30),
                retries: Number(m.retries ?? 0),
                tags: Array.isArray(m.tags) ? m.tags : [],
                enabled: Boolean(m.active ?? true),
                maxRedirects: Number(m.maxredirects ?? m.maxRedirects ?? 10),
                ignoreTls: Boolean(m.ignoreTls ?? false),
                upsideDown: Boolean(m.upsideDown ?? false),
                description: m.description ? String(m.description) : null,
                notificationIds: Array.isArray(m.notificationIds) ? m.notificationIds : [],
                dockerContainer: m.dockerContainer ? String(m.dockerContainer) : null,
                pushToken: m.pushToken ? String(m.pushToken) : null,
                steamGameId: m.steamGameId ? String(m.steamGameId) : null,
                jsonQuery: m.jsonQuery ? String(m.jsonQuery) : null,
                expectedValue: m.expectedValue ? String(m.expectedValue) : null,
                proxyId: m.proxyId ? String(m.proxyId) : null,
                resendNotification: Boolean(m.resendNotification ?? false),
                notificationInterval: m.notificationInterval ? Number(m.notificationInterval) : null,
            });
        }
        const clearTable = async (repo) => {
            const rows = await repo.findAll();
            for (const r of rows)
                await repo.remove(r.id);
        };
        await clearTable(NotificationRepository);
        for (const n of (data.notifications ?? [])) {
            if (!n.name || !n.type)
                continue;
            await NotificationRepository.create({
                name: String(n.name),
                type: String(n.type),
                config: (n.config ?? {}),
                active: Boolean(n.active ?? true),
                applyTo: Array.isArray(n.applyTo) ? n.applyTo : [],
            });
        }
        await clearTable(StatusPageRepository);
        for (const sp of (data.statusPages ?? [])) {
            if (!sp.title || !sp.slug)
                continue;
            await StatusPageRepository.create({
                title: String(sp.title),
                slug: String(sp.slug),
                active: Boolean(sp.active ?? true),
                monitors: Array.isArray(sp.monitors) ? sp.monitors : [],
                customDomain: sp.customDomain ? String(sp.customDomain) : null,
                theme: sp.theme ? String(sp.theme) : 'light',
                description: sp.description ? String(sp.description) : null,
                showUptime: Boolean(sp.showUptime ?? true),
                showHistory: Boolean(sp.showHistory ?? true),
            });
        }
        await clearTable(MaintenanceRepository);
        for (const mw of (data.maintenance ?? [])) {
            if (!mw.title || !mw.startTime || !mw.endTime)
                continue;
            await MaintenanceRepository.create({
                title: String(mw.title),
                description: mw.description ? String(mw.description) : '',
                startTime: new Date(String(mw.startTime)),
                endTime: new Date(String(mw.endTime)),
                monitors: Array.isArray(mw.monitors) ? mw.monitors : [],
                active: Boolean(mw.active ?? true),
            });
        }
        await clearTable(GroupRepository);
        for (const g of (data.groups ?? [])) {
            if (!g.name)
                continue;
            await GroupRepository.create({
                name: String(g.name),
                monitors: Array.isArray(g.monitors) ? g.monitors : [],
            });
        }
        await clearTable(ProxyRepository);
        for (const p of (data.proxies ?? [])) {
            if (!p.name || !p.host || !p.port)
                continue;
            await ProxyRepository.create({
                name: String(p.name),
                protocol: String(p.protocol ?? 'http'),
                host: String(p.host),
                port: Number(p.port),
                auth: p.auth ? p.auth : null,
            });
        }
        return { ok: true };
    },
};
