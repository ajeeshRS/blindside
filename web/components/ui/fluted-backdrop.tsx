// @ts-nocheck
/* Made in Backdrop Studio. Pauses offscreen and respects reduced motion.
Recreate: http://localhost:3001/studio?g=%7B%22v%22%3A1%2C%22kind%22%3A%22fluted%22%2C%22colors%22%3A%5B%22%23e1eaff%22%2C%22%23749aff%22%2C%22%231458eb%22%2C%22%2306113a%22%5D%2C%22background%22%3A%22%23000000%22%2C%22speed%22%3A0.18%2C%22scale%22%3A0.45%2C%22warp%22%3A0.12%2C%22blur%22%3A0.25%2C%22grain%22%3A0.025%2C%22seed%22%3A4%2C%22loop%22%3A12%2C%22dither%22%3A%7B%22on%22%3Afalse%2C%22cell%22%3A3%2C%22levels%22%3A4%7D%2C%22react%22%3A%7B%22pointer%22%3A0.25%2C%22scroll%22%3A0.15%7D%7D */
"use client";
import { useEffect, useRef } from "react";
const createEngine = function createBackdropEngine(canvas, initial) {
    let settings = { ...initial }, destroyed = false, lost = false, visible = true, raf = 0, last = 0, elapsed = 14, previous = performance.now(), lastInput = previous, scroll = window.scrollY, velocity = 0, pixel = 1, frameMs = 0, frameCount = 0;
    let blendStart = 0, blend = 1, dark = 0, darkFrom = 0, darkTo = 0, colors = [], from = [], to = [];
    let pointer = [0, 0], target = [0, 0], ripple = [0, 0], rippleStart = -100000, currentKey = '', program = null, buffer = null;
    let transitionStart = -1000;
    const textures = [];
    let wipeA = null, wipeB = null, wipeProgram = null, wipeFB = null;
    const cache = new Map();
    let locations = new Map();
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)'), colorScheme = matchMedia('(prefers-color-scheme: dark)');
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
    const names = ['base', 'shadow', 'lit', 'accent', 'hi'];
    const rgb = (value) => { const v = value.trim().replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
    const themeHost = () => { let element = canvas; while (element) {
        const host = element.closest('[data-theme]');
        if (host)
            return host;
        const root = element.getRootNode();
        element = root instanceof ShadowRoot ? root.host : null;
    } return null; };
    const isDark = () => settings.theme === 'dark' || settings.theme !== 'light' && (themeHost()?.getAttribute('data-theme') === 'dark' || !themeHost() && colorScheme.matches);
    const palette = () => settings.palettes[isDark() ? 'dark' : 'light'];
    function fallback() { const p = palette(); canvas.style.background = `radial-gradient(ellipse at 10% 20%,${p.accent},transparent 65%),radial-gradient(ellipse at 90% 90%,${p.lit},transparent 65%),${p.base}`; canvas.dataset.fallback = 'true'; canvas.dataset.ready = 'true'; }
    function readColors() {
        const p = palette(), styles = settings.cssColors ? getComputedStyle(canvas) : null;
        to = names.map(k => rgb(styles?.getPropertyValue('--silk-' + k).trim() || p[k]));
        darkTo = isDark() ? 1 : 0;
        from = colors.length ? colors.map(c => [...c]) : to.map(c => [...c]);
        darkFrom = colors.length ? dark : darkTo;
        if (!colors.length) {
            colors = to.map(c => [...c]);
            dark = darkTo;
            blend = 1;
        }
        else {
            blend = motion.matches || settings.blendMs === 0 ? 1 : 0;
            blendStart = performance.now();
            if (motion.matches || settings.blendMs === 0) {
                colors = to.map(c => [...c]);
                dark = darkTo;
            }
        }
        if (!gl || lost)
            fallback();
        request();
    }
    function texture(slot) { if (!gl)
        return; gl.activeTexture(gl.TEXTURE0 + slot); const tex = gl.createTexture(); textures[slot] = tex; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return tex; }
    function makeTextures() {
        if (!gl)
            return;
        if (settings.key.startsWith('kind.')) {
            for (const slot of [0, 1, 2, 3, 4]) {
                texture(slot);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, slot === 4 ? canvas.width : 1, slot === 4 ? canvas.height : 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            }
            wipeA = textures[2];
            wipeB = textures[3];
            return;
        }
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 512;
        textCanvas.height = 256;
        const ctx = textCanvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#fff';
        const text = (settings.text || 'WEBBLOK').slice(0, 40);
        ctx.font = '800 100px sans-serif';
        const width = ctx.measureText(text).width;
        ctx.font = `800 ${Math.min(100, 440 / Math.max(1, width) * 100)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);
        const pixels = ctx.getImageData(0, 0, 512, 256), n = 512 * 256;
        const inside = new Float32Array(n), outside = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const on = pixels.data[i * 4] > .5 * 255;
            inside[i] = on ? 999 : 0;
            outside[i] = on ? 0 : 999;
        }
        for (const d of [inside, outside]) {
            for (let y = 0; y < 256; y++)
                for (let x = 0; x < 512; x++) {
                    const i = y * 512 + x;
                    if (x)
                        d[i] = Math.min(d[i], d[i - 1] + 1);
                    if (y)
                        d[i] = Math.min(d[i], d[i - 512] + 1);
                    if (x && y)
                        d[i] = Math.min(d[i], d[i - 513] + 1.414);
                }
            for (let y = 255; y >= 0; y--)
                for (let x = 511; x >= 0; x--) {
                    const i = y * 512 + x;
                    if (x < 511)
                        d[i] = Math.min(d[i], d[i + 1] + 1);
                    if (y < 255)
                        d[i] = Math.min(d[i], d[i + 512] + 1);
                    if (x < 511 && y < 255)
                        d[i] = Math.min(d[i], d[i + 513] + 1.414);
                }
        }
        for (let i = 0; i < n; i++) {
            const v = Math.max(0, Math.min(255, 128 + (inside[i] - outside[i]) * 8));
            pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = v;
        }
        ctx.putImageData(pixels, 0, 0);
        texture(0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
        const atlas = document.createElement('canvas');
        atlas.width = 512;
        atlas.height = 32;
        const a = atlas.getContext('2d');
        a.fillStyle = '#000';
        a.fillRect(0, 0, 512, 32);
        a.fillStyle = '#fff';
        a.font = '24px monospace';
        a.textAlign = 'center';
        a.textBaseline = 'middle';
        const glyphs = (settings.text || ' .:-=+*oO%#MW@█▓').repeat(16);
        for (let i = 0; i < 16; i++)
            a.fillText(glyphs[i] || '█', i * 32 + 16, 16);
        texture(1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        for (const slot of [2, 3, 4]) {
            texture(slot);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, slot === 4 ? canvas.width : 128, slot === 4 ? canvas.height : 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        wipeA = textures[2];
        wipeB = textures[3];
    }
    function wipe(now, dt) {
        if (!gl || !wipeA || !wipeB || settings.loop || !settings.key.includes('optics.frosted'))
            return;
        if (!wipeProgram) {
            const vert = gl.createShader(gl.VERTEX_SHADER), frag = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(vert, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
            gl.shaderSource(frag, '#version 300 es\nprecision highp float;out vec4 c;uniform sampler2D old;uniform vec2 mouse;uniform float dt,active;void main(){vec2 uv=gl_FragCoord.xy/128.;float v=texture(old,uv).r*exp(-dt*.4);v=max(v,(1.-smoothstep(.025,.12,length(uv-mouse)))*active);c=vec4(v,0.,0.,1.);}');
            gl.compileShader(vert);
            gl.compileShader(frag);
            wipeProgram = gl.createProgram();
            gl.attachShader(wipeProgram, vert);
            gl.attachShader(wipeProgram, frag);
            gl.linkProgram(wipeProgram);
            gl.deleteShader(vert);
            gl.deleteShader(frag);
            wipeFB = gl.createFramebuffer();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, wipeFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, wipeB, 0);
        gl.viewport(0, 0, 128, 128);
        gl.useProgram(wipeProgram);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, wipeA);
        gl.uniform1i(gl.getUniformLocation(wipeProgram, 'old'), 2);
        gl.uniform2f(gl.getUniformLocation(wipeProgram, 'mouse'), target[0] * .5 + .5, target[1] * .5 + .5);
        gl.uniform1f(gl.getUniformLocation(wipeProgram, 'dt'), dt);
        gl.uniform1f(gl.getUniformLocation(wipeProgram, 'active'), now - lastInput < 200 ? 1 : 0);
        const loc = gl.getAttribLocation(wipeProgram, 'a');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        [wipeA, wipeB] = [wipeB, wipeA];
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function compile() {
        if (!gl || lost || destroyed)
            return false;
        try {
            let cached = cache.get(settings.key);
            if (!cached) {
                const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => { const s = gl.createShader(type); gl.shaderSource(s, i ? settings.shader : '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                    const error = gl.getShaderInfoLog(s);
                    gl.deleteShader(s);
                    throw new Error(error || 'Shader compilation failed');
                } return s; });
                const p = gl.createProgram();
                shaders.forEach(s => gl.attachShader(p, s));
                gl.linkProgram(p);
                shaders.forEach(s => gl.deleteShader(s));
                if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                    const error = gl.getProgramInfoLog(p);
                    gl.deleteProgram(p);
                    throw new Error(error || 'Shader link failed');
                }
                cached = { program: p, uniforms: new Map() };
                cache.set(settings.key, cached);
                if (cache.size > 32) {
                    const first = cache.keys().next().value;
                    gl.deleteProgram(cache.get(first).program);
                    cache.delete(first);
                }
            }
            program = cached.program;
            locations = cached.uniforms;
            currentKey = settings.key;
            gl.useProgram(program);
            if (!buffer) {
                buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            }
            else
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            const a = gl.getAttribLocation(program, 'a');
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
            if (!textures.length)
                makeTextures();
            delete canvas.dataset.fallback;
            canvas.style.background = '';
            return true;
        }
        catch (e) {
            fallback();
            settings.onError?.(String(e));
            return false;
        }
    }
    const uniform = (name) => { if (!locations.has(name))
        locations.set(name, gl.getUniformLocation(program, name)); return locations.get(name); };
    const f = (name, value) => gl.uniform1f(uniform(name), value);
    function resize() { if (!gl || lost || destroyed)
        return; const rect = canvas.getBoundingClientRect(); pixel = Math.min(devicePixelRatio || 1, 2) * (settings.scale ?? (coarse.matches ? .4 : .5)); canvas.width = Math.max(1, Math.round(rect.width * pixel)); canvas.height = Math.max(1, Math.round(rect.height * pixel)); gl.viewport(0, 0, canvas.width, canvas.height); request(); }
    function draw(now, fixedTime) {
        if (!gl || lost || destroyed || !program)
            return;
        const before = performance.now(), dt = Math.min(.1, (now - previous) / 1000);
        previous = now;
        if (blend < 1) {
            blend = Math.min(1, (now - blendStart) / (settings.blendMs ?? 450));
            const e = 1 - Math.pow(1 - blend, 3);
            colors = from.map((c, i) => c.map((v, j) => v + (to[i][j] - v) * e));
            dark = darkFrom + (darkTo - darkFrom) * e;
        }
        const behaviours = settings.behaviour || [];
        const active = (s) => behaviours.includes('behaviour.' + s);
        const idle = active('idle') && now - lastInput > 5000 ? .08 : 1;
        velocity *= Math.exp(-dt * 4);
        if (!settings.paused && (!motion.matches || settings.animateReduced))
            elapsed += dt * Number(settings.params.uSpeed ?? 1) * idle * (1 + (active('turbulence') ? Math.min(2, Math.abs(velocity) * .01) : 0));
        pointer = pointer.map((v, i) => v + (target[i] - v) * (1 - Math.exp(-dt * 1.55)));
        wipe(now, dt);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, wipeA);
        gl.uniform1i(uniform('uText'), 0);
        gl.uniform1i(uniform('uGlyph'), 1);
        gl.uniform1i(uniform('uWipe'), 2);
        gl.uniform1i(uniform('uPrevious'), 4);
        f('uTransition', Math.min(1, (now - transitionStart) / (settings.transitionMs ?? 150)));
        gl.uniform2f(uniform('uRes'), canvas.width, canvas.height);
        gl.uniform2f(uniform('uMouse'), active('cursor') ? pointer[0] : 0, active('cursor') ? pointer[1] : 0);
        gl.uniform2f(uniform('uRipple'), ripple[0], ripple[1]);
        f('uRippleAge', (now - rippleStart) / 1000);
        f('uTime', fixedTime ?? (motion.matches && !settings.animateReduced ? 14 : elapsed));
        f('uPixel', pixel);
        f('uDark', dark);
        f('uCalm', settings.calm ?? .62);
        f('uSeed', settings.seed ?? 0);
        f('uLoop', settings.loop ?? 0);
        f('uScroll', active('parallax') && !motion.matches ? window.scrollY : 0);
        f('uFocus', 0);
        f('uIntensity', 1);
        f('uZoom', 1);
        for (const [key, value] of Object.entries(settings.params)) {
            if (Array.isArray(value)) {
                if (value.length === 2)
                    gl.uniform2fv(uniform(key), value);
                else if (value.length === 3)
                    gl.uniform3fv(uniform(key), value);
                else if (value.length === 4)
                    gl.uniform4fv(uniform(key), value);
            }
            else
                f(key, value);
        }
        colors.forEach((c, i) => { let tint = 1; if (active('daylight'))
            tint = .85 + .15 * Math.sin(new Date().getHours() / 24 * Math.PI * 2 - Math.PI / 2); gl.uniform3f(uniform('u' + names[i][0].toUpperCase() + names[i].slice(1)), c[0] * tint, c[1] * tint, c[2] * tint); });
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.dataset.ready = 'true';
        frameMs = frameMs * .9 + (performance.now() - before) * .1;
        if (++frameCount % 30 === 0 && settings.onFrame) {
            const pixels = new Uint8Array(4 * 9);
            let worst = 21;
            for (let i = 0; i < 9; i++) {
                gl.readPixels(Math.floor(canvas.width * (.35 + (i % 3) * .15)), Math.floor(canvas.height * (.42 + Math.floor(i / 3) * .1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels.subarray(i * 4, i * 4 + 4));
                const c = [0, 1, 2].map(j => { const v = pixels[i * 4 + j] / 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
                const l = c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
                worst = Math.min(worst, dark > .5 ? 1.05 / (l + .05) : (l + .05) / .05);
            }
            settings.onFrame({ ms: frameMs, contrast: worst, scale: settings.scale ?? .5 });
            if (settings.autoQuality && frameMs > 1000 / (settings.fps ?? 30) && (settings.scale ?? .5) > .2) {
                settings.scale = Math.max(.2, (settings.scale ?? .5) - .05);
                resize();
            }
        }
    }
    function loop(now) { raf = 0; if (destroyed || lost || !visible || document.hidden)
        return; if (now - last >= 1000 / (settings.fps ?? 30)) {
        last = now;
        draw(now);
    } if ((!settings.paused && (!motion.matches || settings.animateReduced)) || blend < 1 || now - transitionStart < (settings.transitionMs ?? 150))
        raf = requestAnimationFrame(loop); }
    function request() { if (!raf && !destroyed && !lost && visible && !document.hidden)
        raf = requestAnimationFrame(loop); }
    function onPointer(e) { lastInput = performance.now(); const r = canvas.getBoundingClientRect(); target = [Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)), Math.max(-1, Math.min(1, 1 - (e.clientY - r.top) / r.height * 2))]; if (motion.matches) {
        pointer = [...target];
        draw(performance.now());
    }
    else
        request(); }
    function onClick(e) { const r = canvas.getBoundingClientRect(); ripple = [((e.clientX - r.left) / r.width - .5) * r.width / r.height * 1.5, (.5 - (e.clientY - r.top) / r.height) * 1.5]; rippleStart = performance.now(); lastInput = rippleStart; request(); }
    function onScroll() { velocity = window.scrollY - scroll; scroll = window.scrollY; lastInput = performance.now(); request(); }
    function onVisibility() { previous = performance.now(); if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
    else
        request(); }
    function onLost(e) { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; fallback(); }
    function onRestored() { lost = false; cache.clear(); textures.length = 0; wipeProgram = null; wipeFB = null; buffer = null; program = null; if (compile()) {
        resize();
        readColors();
        request();
    } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; previous = performance.now(); if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
    else
        request(); }, { rootMargin: '80px' });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(readColors);
    const host = themeHost();
    if (host)
        mo.observe(host, { attributes: true, attributeFilter: ['data-theme'] });
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onClick, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', readColors);
    colorScheme.addEventListener('change', readColors);
    readColors();
    if (gl && !gl.isContextLost()) {
        compile();
        resize();
        request();
    }
    else
        fallback();
    return {
        update(next) { const old = settings; settings = { ...settings, ...next }; if (settings.key !== currentKey || next.transition) {
            if (gl && program && !lost) {
                gl.activeTexture(gl.TEXTURE4);
                gl.bindTexture(gl.TEXTURE_2D, textures[4]);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, canvas.width, canvas.height, 0);
                transitionStart = motion.matches || settings.blendMs === 0 ? -1000 : performance.now();
            }
            if (settings.key !== currentKey)
                compile();
        } if (next.text !== undefined && next.text !== old.text) {
            textures.forEach(t => gl?.deleteTexture(t));
            textures.length = 0;
            makeTextures();
        } if (settings.scale !== old.scale)
            resize(); if (next.palettes || next.theme || next.cssColors)
            readColors(); request(); },
        renderAt(time) { draw(performance.now(), time); },
        pixels() { if (!gl)
            return null; const data = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data); return data; },
        destroy() { destroyed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); window.removeEventListener('pointermove', onPointer); window.removeEventListener('pointerdown', onClick); window.removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVisibility); motion.removeEventListener('change', readColors); colorScheme.removeEventListener('change', readColors); canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored); if (gl && !lost) {
            cache.forEach(p => gl.deleteProgram(p.program));
            gl.deleteBuffer(buffer);
            textures.forEach(t => gl.deleteTexture(t));
            gl.deleteProgram(wipeProgram);
            gl.deleteFramebuffer(wipeFB);
        } cache.clear(); }
    };
};
/* Blindside: light palette added; the theme now follows <html data-theme>. */
const settings = {"key":"kind.fluted","shader":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\nuniform vec2 uRes,uMouse,uTileOffset,uFullRes;\nuniform float uTime,uLoop,uMotion,uZoom,uWarp,uBlur,uGrain,uSeed,uScroll,uPointer,uScrollResponse,uDither,uCell,uLevels,uTransition;\nuniform vec3 uBase,uShadow,uLit,uAccent,uHi;\nuniform sampler2D uPrevious;\nvec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }\nfloat snoise(vec2 v) {\n  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n  vec2 i = floor(v + dot(v, C.yy));\n  vec2 x0 = v - i + dot(i, C.xx);\n  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n  vec4 x12 = x0.xyxy + C.xxzz;\n  x12.xy -= i1;\n  i = mod(i, 289.0);\n  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\n  m = m * m; m = m * m;\n  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n  vec3 h = abs(x) - 0.5;\n  vec3 ox = floor(x + 0.5);\n  vec3 a0 = x - ox;\n  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);\n  vec3 g;\n  g.x = a0.x * x0.x + h.x * x0.y;\n  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n  return 130.0 * dot(m, g);\n}\nfloat fbm(vec2 p) {\n  float s = 0.0, a = 0.5;\n  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);\n  for (int i = 0; i < 4; i++) { s += a * snoise(p); p = r * p * 2.02; a *= 0.5; }\n  return s;\n}\n\n\nfloat hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nvec3 voronoi(vec2 p){vec2 i=floor(p),f=fract(p);float a=9.,b=9.,id=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 o=vec2(hash21(i+g),hash21(i+g+17.));float d=length(g+o-f);if(d<a){b=a;a=d;id=hash21(i+g);}else b=min(b,d);}return vec3(a,b,id);}\nfloat bayer8(vec2 p){ivec2 q=ivec2(mod(p,8.));int v=0;for(int i=0;i<3;i++){int x=(q.x>>i)&1,y=(q.y>>i)&1;v|=((x^y)*2+y)<<(4-i*2);}return float(v)/64.;}\nfloat noise3(vec3 p){float z=floor(p.z),f=fract(p.z);return mix(snoise(p.xy+z*17.),snoise(p.xy+(z+1.)*17.),f*f*(3.-2.*f));}\nvec2 curl(vec2 p){float e=.01;return vec2(fbm(p+vec2(0.,e))-fbm(p-vec2(0.,e)),-fbm(p+vec2(e,0.))+fbm(p-vec2(e,0.)))/(2.*e);}\nfloat sdCircle(vec2 p,float r){return length(p)-r;}\nfloat sdBox(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}\n\nvec3 linearRGB(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}\nvec3 toLab(vec3 c){c=linearRGB(c);vec3 q=mat3(.4122214708,.2119034982,.0883024619,.5363325363,.6806995451,.2817188376,.0514459929,.1073969566,.6299787005)*c;q=pow(max(q,0.),vec3(1./3.));return mat3(.2104542553,1.9779984951,.0259040371,.793617785,-2.428592205,.7827717662,-.0040720468,.4505937099,-.808675766)*q;}\nvec3 fromLab(vec3 c){vec3 q=mat3(1.,1.,1.,.3963377774,-.1055613458,-.0894841775,.2158037573,-.0638541728,-1.291485548)*c;q=q*q*q;q=mat3(4.0767416621,-1.2684380046,-.0041960863,-3.3077115913,2.6097574011,-.7034186147,.2309699292,-.3413193965,1.707614701)*q;q=max(q,0.);return clamp(mix(q*12.92,1.055*pow(q,vec3(1./2.4))-.055,step(vec3(.0031308),q)),0.,1.);}\nvec3 ramp(float value){float x=clamp(value,0.,1.)*4.;vec3 a=uBase,b=uShadow;if(x>=3.){a=uAccent;b=uHi;}else if(x>=2.){a=uLit;b=uAccent;}else if(x>=1.){a=uShadow;b=uLit;}return fromLab(mix(toLab(a),toLab(b),smoothstep(0.,1.,x-floor(min(x,3.99999)))));}\n\nfloat cloth(vec2 p,vec2 orbit){float bend=sin(p.x*.7+orbit.x)*cos(p.y*.55+orbit.y);float a=(p.x*.62-p.y)*2.6+bend*(.5+uWarp*3.);return .5+.36*sin(a)+.14*sin(a*.47+1.7+orbit.y*.2);}\nfloat satinLight(vec2 p,vec2 orbit){float e=.006,h=cloth(p,orbit);vec3 n=normalize(vec3((h-cloth(p+vec2(e,0),orbit))/e*.34,(h-cloth(p+vec2(0,e),orbit))/e*.34,1.));vec3 l=normalize(vec3(-.5+uMouse.x*uPointer*.2,.6,.65));float sheen=pow(max(dot(n,normalize(l+vec3(0,0,1))),0.),38.);return .12+sheen*.8+pow(1.-abs(n.z),.9)*.35;} float field(vec2 p,vec2 o){float rib=fract(p.x*5.)-.5;p.x+=rib*(1.-rib*rib*4.)*.11;return satinLight(p,o)*(.94-.06*rib)*exp(-dot(p,p)*.12);}\nvoid main(){\n vec2 resolution=uFullRes.x>0.?uFullRes:uRes;vec2 xy=gl_FragCoord.xy+uTileOffset;vec2 uv=xy/resolution;\n float theta=6.28318530718*uTime/max(uLoop,6.);vec2 orbit=vec2(cos(theta),sin(theta))*uMotion;\n vec2 p=(xy-.5*resolution)/resolution.y*2.;p/=mix(.65,1.65,uZoom);p+=vec2(sin(uSeed*1.3),cos(uSeed*2.1))*.15;\n p-=uMouse*uPointer*.12;p.y+=uScroll*uScrollResponse*.00015;\n p+=uWarp*.22*vec2(snoise(p+orbit),snoise(p+orbit+13.));\n float softness=uBlur*.09;float value=field(p,orbit)*.4;\n value+=(field(p+vec2(softness,0),orbit)+field(p-vec2(softness,0),orbit)+field(p+vec2(0,softness),orbit)+field(p-vec2(0,softness),orbit))*.15;\n value=clamp(value,0.,1.);vec3 color=ramp(value);\n if(uDither>.5){float levels=uLevels-1.;float stepped=floor(value*levels+bayer8(floor(xy/uCell)))/levels;color=ramp(stepped);}\n float noise=hash21(xy+vec2(cos(theta),sin(theta))*41.7*uMotion)-.5;color+=noise*uGrain;\n vec3 previous=texture(uPrevious,gl_FragCoord.xy/uRes).rgb;fragColor=vec4(mix(previous,clamp(color,0.,1.),uTransition),1.);\n}","palettes":{"light":{"base":"#e9efff","shadow":"#c9d7ff","lit":"#7d9cff","accent":"#bcd0ff","hi":"#ffffff"},"dark":{"base":"#000000","shadow":"#06113a","lit":"#1458eb","accent":"#749aff","hi":"#e1eaff"}},"scale":0.5,"fps":30,"loop":12,"seed":4,"blendMs":300,"transitionMs":200,"behaviour":["behaviour.cursor","behaviour.parallax"],"params":{"uSpeed":1,"uMotion":0.18,"uZoom":0.45,"uWarp":0.12,"uBlur":0.25,"uGrain":0.025,"uPointer":0.25,"uScrollResponse":0.15,"uDither":0,"uCell":3,"uLevels":4,"uTileOffset":[0,0],"uFullRes":[0,0]}};
export default function Background({className = "", paused = false}: {className?: string; paused?: boolean}) {
 const canvas = useRef<HTMLCanvasElement>(null);
 const engine = useRef<ReturnType<typeof createEngine> | null>(null);
 useEffect(() => {if (!canvas.current) return; engine.current=createEngine(canvas.current,settings);return () => {engine.current?.destroy();engine.current=null;};},[]);
 useEffect(() => {engine.current?.update({paused});},[paused]);
 return <canvas ref={canvas} className={className} aria-hidden="true" style={{display:"block",width:"100%",height:"100%"}} />;
}
