import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
const projectPath = (relativePath) => fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
function parseLinkAttributes(html) {
    return [...html.matchAll(/<link\b([^>]*)>/gi)].map(([, source]) => Object.fromEntries(
        [...source.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, name, , value]) => [name.toLowerCase(), value]),
    ));
}
function decodePng(relativePath) {
    const bytes = readFileSync(projectPath(relativePath));
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    let offset = 8;
    let width = 0;
    let height = 0;
    const compressed = [];
    while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset);
        const type = bytes.toString('ascii', offset + 4, offset + 8);
        const data = bytes.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            expect([...data.subarray(8)]).toEqual([8, 6, 0, 0, 0]);
        }
        else if (type === 'IDAT') {
            compressed.push(data);
        }
        else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }
    const scanlines = inflateSync(Buffer.concat(compressed));
    const stride = width * 4;
    expect(scanlines).toHaveLength(height * (stride + 1));
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        const sourceOffset = y * (stride + 1);
        expect(scanlines[sourceOffset]).toBe(0);
        scanlines.copy(pixels, y * stride, sourceOffset + 1, sourceOffset + 1 + stride);
    }
    return { width, height, pixels };
}
function pixelAt(image, x, y) {
    const offset = (y * image.width + x) * 4;
    return [...image.pixels.subarray(offset, offset + 4)];
}
function connectedComponents(image, included) {
    const present = new Uint8Array(image.width * image.height);
    const visited = new Uint8Array(present.length);
    for (let index = 0; index < present.length; index += 1) {
        const offset = index * 4;
        present[index] = Number(included(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], image.pixels[offset + 3]));
    }
    let components = 0;
    for (let seed = 0; seed < present.length; seed += 1) {
        if (!present[seed] || visited[seed])
            continue;
        components += 1;
        const queue = [seed];
        visited[seed] = 1;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const index = queue[cursor];
            const x = index % image.width;
            const y = Math.floor(index / image.width);
            for (const neighbour of [
                x > 0 ? index - 1 : -1,
                x + 1 < image.width ? index + 1 : -1,
                y > 0 ? index - image.width : -1,
                y + 1 < image.height ? index + image.width : -1,
            ]) {
                if (neighbour < 0 || !present[neighbour] || visited[neighbour])
                    continue;
                visited[neighbour] = 1;
                queue.push(neighbour);
            }
        }
    }
    return components;
}
function contentBounds(image, included) {
    let left = image.width;
    let top = image.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
            const offset = (y * image.width + x) * 4;
            if (!included(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], image.pixels[offset + 3]))
                continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        }
    }
    return { left, top, right, bottom };
}
describe('Balanced cube site icon', () => {
    it('ships a tilted three-face cube with a single lowest contact vertex', () => {
        const svg = readFileSync(projectPath('public/favicon.svg'), 'utf8');
        expect(svg).toContain('viewBox="0 0 64 64"');
        expect(svg.match(/id="cube-body"/g)).toHaveLength(1);
        expect(svg.match(/data-role="facet"/g)).toHaveLength(3);
        expect(svg.match(/id="crystal-ridges"/g)).toHaveLength(1);
        expect(svg.match(/data-role="seam"/g)).toHaveLength(1);
        expect(svg).not.toContain('#E39A58');
        expect(svg.match(/<linearGradient /g)).toHaveLength(3);
        expect(svg).toContain('id="cube-body" d="M7 16 L30 6 L49 22 L53 48 L30 58 L11 42 Z"');
        expect(svg).toMatch(/id="crystal-ridges"[^>]*stroke="#E6FCFF"[^>]*stroke-width="1.15"/);
        expect(svg).not.toMatch(/<(?:rect|text)\b/i);
        expect(svg).not.toMatch(/#(?:3f9f96|6687d5|c98243|9875be)/i);
        expect(svg).not.toMatch(/>[A-Za-z]</);
    });
    it.each([16, 32, 64])('renders a readable connected transparent %s px favicon', (size) => {
        const image = decodePng(`public/favicon-${size}x${size}.png`);
        expect(image).toMatchObject({ width: size, height: size });
        expect(pixelAt(image, 0, 0)[3]).toBe(0);
        expect(pixelAt(image, size - 1, 0)[3]).toBe(0);
        expect(pixelAt(image, 0, size - 1)[3]).toBe(0);
        expect(pixelAt(image, size - 1, size - 1)[3]).toBe(0);
        expect(connectedComponents(image, (_r, _g, _b, alpha) => alpha >= 128)).toBe(1);
        let opaque = 0;
        let partial = 0;
        let deepBlue = 0;
        let ice = 0;
        for (let offset = 0; offset < image.pixels.length; offset += 4) {
            const red = image.pixels[offset];
            const green = image.pixels[offset + 1];
            const blue = image.pixels[offset + 2];
            const alpha = image.pixels[offset + 3];
            if (alpha >= 240)
                opaque += 1;
            if (alpha > 0 && alpha < 255)
                partial += 1;
            if (alpha >= 240 && red <= 50 && green <= 120 && blue <= 180)
                deepBlue += 1;
            if (alpha >= 200 && green >= 180 && blue >= 220 && blue > red)
                ice += 1;
        }
        expect(opaque).toBeGreaterThan(size * size * 0.2);
        expect(opaque).toBeLessThan(size * size * 0.65);
        expect(partial).toBeGreaterThan(0);
        // Even at 16 px, reserve at least 4% of the full icon for the dark face.
        expect(deepBlue).toBeGreaterThan(size * size * 0.04);
        expect(ice).toBeGreaterThan(size);
        const bounds = contentBounds(image, (_r, _g, _b, alpha) => alpha >= 128);
        expect(bounds.left).toBeGreaterThanOrEqual(Math.floor(size * 0.10));
        expect(bounds.right).toBeLessThanOrEqual(Math.ceil(size * 0.88));
        expect(bounds.top).toBeGreaterThanOrEqual(Math.floor(size * 0.05));
        expect(bounds.bottom).toBeLessThanOrEqual(Math.ceil(size * 0.95));
    });
    it('separates the three faces in luminance and keeps the bright contact ridge', () => {
        const image = decodePng('public/favicon-64x64.png');
        const brightness = (x, y) => {
            const [r, g, b] = pixelAt(image, x, y);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        expect(brightness(30, 18)).toBeGreaterThan(brightness(40, 40) + 70);
        expect(brightness(40, 40)).toBeGreaterThan(brightness(18, 38) + 30);
        expect(brightness(28, 48)).toBeGreaterThan(brightness(18, 38) + 70);
        expect(brightness(40, 34)).toBeGreaterThan(brightness(40, 44));
    });
    it('keeps the 64 px silhouette materially asymmetric', () => {
        const image = decodePng('public/favicon-64x64.png');
        let bodyPixels = 0;
        let mirroredMismatch = 0;
        for (let y = 0; y < image.height; y += 1) {
            for (let x = 0; x < image.width; x += 1) {
                const alpha = pixelAt(image, x, y)[3] >= 128;
                const mirrored = pixelAt(image, image.width - 1 - x, y)[3] >= 128;
                if (alpha)
                    bodyPixels += 1;
                if (alpha !== mirrored)
                    mirroredMismatch += 1;
            }
        }
        expect(mirroredMismatch).toBeGreaterThan(bodyPixels * 0.12);
    });
    it('renders the Apple icon on one opaque background inside the safe area', () => {
        const image = decodePng('public/apple-touch-icon.png');
        expect(image).toMatchObject({ width: 180, height: 180 });
        const background = [7, 23, 41, 255];
        expect(pixelAt(image, 0, 0)).toEqual(background);
        expect(pixelAt(image, 179, 0)).toEqual(background);
        expect(pixelAt(image, 0, 179)).toEqual(background);
        expect(pixelAt(image, 179, 179)).toEqual(background);
        for (let offset = 3; offset < image.pixels.length; offset += 4) {
            expect(image.pixels[offset]).toBe(255);
        }
        const isBody = (red, green, blue) => (Math.abs(red - background[0]) + Math.abs(green - background[1]) + Math.abs(blue - background[2]) > 18);
        expect(connectedComponents(image, (red, green, blue) => isBody(red, green, blue))).toBe(1);
        const bounds = contentBounds(image, (red, green, blue) => isBody(red, green, blue));
        expect(bounds.left).toBeGreaterThanOrEqual(16);
        expect(bounds.top).toBeGreaterThanOrEqual(16);
        expect(bounds.right).toBeLessThanOrEqual(163);
        expect(bounds.bottom).toBeLessThanOrEqual(163);
    });
    it('links every MIME- and size-qualified icon without a data URI or PWA surface', () => {
        const html = readFileSync(projectPath('index.html'), 'utf8');
        const links = parseLinkAttributes(html);
        expect(links).toContainEqual(expect.objectContaining({ rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' }));
        for (const size of [16, 32, 64]) {
            expect(links).toContainEqual(expect.objectContaining({ rel: 'icon', type: 'image/png', sizes: `${size}x${size}`, href: `/favicon-${size}x${size}.png` }));
        }
        expect(links).toContainEqual(expect.objectContaining({ rel: 'apple-touch-icon', type: 'image/png', sizes: '180x180', href: '/apple-touch-icon.png' }));
        expect(html).not.toContain('data:image');
        expect(html).not.toMatch(/rel="manifest"|service-worker|apple-mobile-web-app/i);
    });
});
