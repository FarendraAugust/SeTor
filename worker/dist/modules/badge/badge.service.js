import { MonitorService } from '../monitor/monitor.service.js';
const COLOR_MAP = {
    brightgreen: '#44cc11',
    green: '#97ca00',
    yellow: '#dfb317',
    yellowgreen: '#a4a61d',
    orange: '#fe7d37',
    red: '#e05d44',
    blue: '#007ec6',
    blueviolet: '#6a1bb6',
    purple: '#6a1bb6',
    grey: '#555',
    gray: '#555',
    lightgrey: '#9f9f9f',
    lightgray: '#9f9f9f',
};
const STYLES = ['flat', 'plastic', 'for-the-badge', 'social'];
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function renderBadge(params) {
    const label = escapeXml(params.label);
    const value = escapeXml(params.value);
    const color = COLOR_MAP[params.color] ?? (/^#[0-9a-fA-F]{6}$/.test(params.color) ? params.color : params.color);
    const style = STYLES.includes(params.style) ? params.style : 'flat';
    const isLarge = style === 'for-the-badge';
    const isSocial = style === 'social';
    const fontSize = isLarge ? 13 : 11;
    const padding = isLarge ? 10 : isSocial ? 7 : 6;
    const height = isLarge ? 28 : isSocial ? 22 : 20;
    const charWidth = isLarge ? 8.5 : isSocial ? 7.5 : 7;
    const displayLabel = isLarge ? label.toUpperCase() : label;
    const displayValue = isLarge ? value.toUpperCase() : value;
    const labelWidth = Math.max(20, Math.ceil(displayLabel.length * charWidth + padding * 2));
    const valueWidth = Math.max(20, Math.ceil(displayValue.length * charWidth + padding * 2));
    const totalWidth = labelWidth + valueWidth;
    const rx = style === 'for-the-badge' ? 4 : style === 'social' ? 5 : 3;
    const textY = Math.round(height / 2 + (fontSize > 11 ? 5 : 4));
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${displayLabel}: ${displayValue}">`,
        `  <title>${displayLabel}: ${displayValue}</title>`,
        `  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
        `  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="${rx}" fill="#fff"/></clipPath>`,
        `  <g clip-path="url(#r)">`,
        `    <rect width="${labelWidth}" height="${height}" fill="#555"/>`,
        `    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>`,
        `    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>`,
        `  </g>`,
        `  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="${fontSize}">`,
        `    <text x="${Math.round(labelWidth / 2)}" y="${textY}" fill="#010101" fill-opacity=".3">${displayLabel}</text>`,
        `    <text x="${Math.round(labelWidth / 2)}" y="${textY - 1}">${displayLabel}</text>`,
        `    <text x="${Math.round(labelWidth + valueWidth / 2)}" y="${textY}" fill="#010101" fill-opacity=".3">${displayValue}</text>`,
        `    <text x="${Math.round(labelWidth + valueWidth / 2)}" y="${textY - 1}">${displayValue}</text>`,
        `  </g>`,
        `</svg>`,
    ].join('\n');
}
export const BadgeService = {
    async forMonitor(id, opts) {
        const monitor = await MonitorService.monitorById(id);
        const uptime = `${monitor.uptime.toFixed(2)}%`;
        const status = monitor.status === 'down' ? 'down' : monitor.status === 'up' ? 'up' : 'pending';
        const color = status === 'down' ? 'red' : status === 'up' ? (opts.color ?? 'brightgreen') : 'yellow';
        return renderBadge({
            label: opts.label ?? 'uptime',
            value: uptime,
            color,
            style: opts.style ?? 'flat',
        });
    },
};
