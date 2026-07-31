import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import authRoutes from './auth/routes.js';
import { bus } from './bus/index.js';
const app = new Hono();
app.use('*', cors({
    origin: config.corsOrigins,
    credentials: true,
}));
app.use('*', logger());
app.get('/', (c) => c.json({ name: 'worker', version: '1.0.0', status: 'running' }));
app.route('/auth', authRoutes);
bus.connect().then(() => {
    bus.subscribe('worker', (event) => {
        console.log(`[bus] received: ${event.type} from ${event.source}`, event.data);
    });
});
serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
}, (info) => {
    console.log(`worker running on http://${config.host}:${info.port}`);
    console.log(`worker id: ${bus.workerId}`);
});
