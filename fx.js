/* fx.js — motion engine.
 *
 * One requestAnimationFrame loop for the whole site. Work is batched per frame in
 * three phases so layout is never read after it was written (no thrashing):
 *   1. READ   — measure (rects, scroll)
 *   2. STEP   — advance springs (pure maths)
 *   3. WRITE  — apply styles
 * Callers register keyed jobs; a key replaces its previous job, so a burst of
 * pointermove events costs one write per frame, not one per event.
 *
 * Springs are interruptible (they carry velocity), so changing the target mid-flight
 * never snaps. That is why tilt/magnetic/parallax use springs, not CSS transitions.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    function lite() { return root.getAttribute('data-fx') === 'lite' || reduceMotion.matches; }

    /* ---------- frame scheduler ---------- */
    var reads = new Map(), writes = new Map(), springs = new Set();
    var raf = 0, last = 0;

    function request() { if (!raf) { raf = requestAnimationFrame(frame); } }

    function frame(t) {
        raf = 0;
        var dt = Math.min((t - (last || t)) / 1000, 1 / 20);   // clamp: a background tab must not explode the physics
        last = t;

        if (reads.size) {
            var r = Array.from(reads.values()); reads.clear();
            for (var i = 0; i < r.length; i++) { r[i](); }
        }
        springs.forEach(function (s) { s.step(dt); });
        if (writes.size) {
            var w = Array.from(writes.values()); writes.clear();
            for (var j = 0; j < w.length; j++) { w[j](); }
        }
        if (springs.size || reads.size || writes.size) { request(); } else { last = 0; }
    }

    var FX = window.FX = {
        read:  function (key, fn) { reads.set(key, fn);  request(); },
        write: function (key, fn) { writes.set(key, fn); request(); },
        lite:  lite,
        finePointer: function () { return finePointer.matches; }
    };

    /* ---------- spring (semi-implicit Euler, substepped for stability) ---------- */
    function Spring(value, opts) {
        opts = opts || {};
        this.x = value; this.v = 0; this.target = value;
        this.k = opts.k || 170; this.c = opts.c || 22; this.eps = opts.eps || 0.001;
        this.apply = opts.apply || function () {};
        this.done = opts.done || null;
    }
    Spring.prototype.to = function (target) { this.target = target; springs.add(this); request(); };
    Spring.prototype.jump = function (value) { this.x = value; this.v = 0; this.target = value; this.apply(value); };
    Spring.prototype.step = function (dt) {
        var n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
        for (var i = 0; i < n; i++) {
            var a = -this.k * (this.x - this.target) - this.c * this.v;
            this.v += a * h;
            this.x += this.v * h;
        }
        if (Math.abs(this.x - this.target) < this.eps && Math.abs(this.v) < this.eps) {
            this.x = this.target; this.v = 0; springs.delete(this);
            if (this.done) { this.done(); }
        }
        var self = this;
        writes.set(this, function () { self.apply(self.x); });
    };
    FX.Spring = Spring;

    /* ---------- tab visibility: pause ambient loops when nobody is looking ---------- */
    document.addEventListener('visibilitychange', function () { root.classList.toggle('is-hidden', document.hidden); });

    /* ---------- pointer effects (fine pointers only; touch has no hover) ---------- */
    var litNodes = new Set();

    function setupPointer() {
        if (!finePointer.matches) { return; }

        /* sheen + rim angle on glass, soft light on surfaces */
        var lightTargets = Array.prototype.slice.call(document.querySelectorAll('.glass, .surface'));
        lightTargets.forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                if (lite()) { return; }
                var cx = e.clientX, cy = e.clientY;
                FX.read(el, function () {
                    var b = el.getBoundingClientRect();
                    var x = cx - b.left, y = cy - b.top;
                    var ang = Math.round(Math.atan2(y - b.height / 2, x - b.width / 2) * 180 / Math.PI + 90);
                    FX.write(el, function () {
                        el.style.setProperty('--mx', x + 'px');
                        el.style.setProperty('--my', y + 'px');
                        el.style.setProperty('--rim', ang + 'deg');
                        el.classList.add('is-lit');
                    });
                });
            });
            el.addEventListener('pointerleave', function () { el.classList.remove('is-lit'); });
        });

        /* 3D tilt via springs */
        document.querySelectorAll('.tilt').forEach(function (el) {
            var max = el.classList.contains('portrait') ? 9 : 5;
            var rx = new Spring(0, { k: 190, c: 20, eps: 0.01, apply: function (v) { el.style.setProperty('--rx', v.toFixed(2) + 'deg'); } });
            var ry = new Spring(0, { k: 190, c: 20, eps: 0.01, apply: function (v) { el.style.setProperty('--ry', v.toFixed(2) + 'deg'); } });
            el.addEventListener('pointermove', function (e) {
                if (lite()) { return; }
                var cx = e.clientX, cy = e.clientY;
                FX.read('tilt', function () {
                    var b = el.getBoundingClientRect();
                    var px = (cx - b.left) / b.width - .5, py = (cy - b.top) / b.height - .5;
                    ry.to(px * max * 2); rx.to(-py * max * 2);
                });
            });
            el.addEventListener('pointerleave', function () { rx.to(0); ry.to(0); });
        });

        /* magnetic buttons: pulled toward the pointer, released with a spring */
        document.querySelectorAll('.magnetic').forEach(function (el) {
            var sx = new Spring(0, { k: 220, c: 16, eps: 0.02, apply: function (v) { el._mx = v; place(); } });
            var sy = new Spring(0, { k: 220, c: 16, eps: 0.02, apply: function (v) { el._my = v; place(); } });
            el._mx = 0; el._my = 0;
            function place() { el.style.translate = el._mx.toFixed(2) + 'px ' + el._my.toFixed(2) + 'px'; }
            el.addEventListener('pointermove', function (e) {
                if (lite()) { return; }
                var cx = e.clientX, cy = e.clientY;
                FX.read(el, function () {
                    var b = el.getBoundingClientRect();
                    sx.to((cx - (b.left + b.width / 2)) * .28);
                    sy.to((cy - (b.top + b.height / 2)) * .36);
                });
            });
            el.addEventListener('pointerleave', function () { sx.to(0); sy.to(0); });
        });

        /* aurora parallax + hero letters rising toward the pointer */
        var aur = document.querySelector('.aurora');
        var ax = new Spring(0, { k: 40, c: 14, eps: 0.05, apply: function () { place(); } });
        var ay = new Spring(0, { k: 40, c: 14, eps: 0.05, apply: function () { place(); } });
        function place() { if (aur) { aur.style.translate = ax.x.toFixed(1) + 'px ' + ay.x.toFixed(1) + 'px'; } }

        var chars = Array.prototype.slice.call(document.querySelectorAll('.display .ch')).map(function (el) {
            var s = new Spring(0, { k: 150, c: 14, eps: 0.05, apply: function (v) { el.style.setProperty('--lift', v.toFixed(2)); } });
            return { el: el, s: s, cx: 0, cy: 0 };
        });
        var charsReady = false;

        window.addEventListener('pointermove', function (e) {
            if (lite()) { return; }
            var px = e.clientX, py = e.clientY;
            FX.read('global-pointer', function () {
                var w = window.innerWidth, h = window.innerHeight;
                ax.to(-(px / w - .5) * 34); ay.to(-(py / h - .5) * 34);
                if (window.scrollY > 500 || !chars.length) { return; }
                if (!charsReady) {                            // measure once, after the entrance animation has settled
                    chars.forEach(function (c) { var b = c.el.getBoundingClientRect(); c.cx = b.left + b.width / 2; c.cy = b.top + b.height / 2 + window.scrollY; });
                    charsReady = true;
                }
                var y = py + window.scrollY;
                chars.forEach(function (c) {
                    var d = Math.hypot(px - c.cx, y - c.cy);
                    c.s.to(Math.max(0, 1 - d / 220) * 22);
                });
            });
        }, { passive: true });
        window.addEventListener('resize', function () { charsReady = false; });
    }

    /* ---------- Liquid Glass "materialise": modulate lensing strength, not opacity ---------- */
    function materialise() {
        var disp = document.getElementById('lens-disp');
        if (!disp || !root.classList.contains('lens') || lite()) { return; }
        var s = new Spring(90, { k: 60, c: 9, eps: 0.2, apply: function (v) { disp.setAttribute('scale', v.toFixed(1)); } });
        s.jump(90);
        setTimeout(function () { s.to(26); }, 250);
    }

    /* ---------- scroll: progress fallback + hero parallax fallback (only if CSS timelines unsupported) ---------- */
    var cssTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
    FX.scroll = function (cb) {
        var queued = false;
        window.addEventListener('scroll', function () {
            if (queued) { return; }
            queued = true;
            FX.read(cb, function () { queued = false; cb(window.scrollY); });
        }, { passive: true });
        cb(window.scrollY);
    };
    if (!cssTimeline) {
        var bar = document.querySelector('.progress span');
        var hc = document.querySelector('.hero-copy'), hv = document.querySelector('.hero-visual');
        FX.scroll(function (y) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var p = max > 0 ? y / max : 0, k = Math.min(y / 640, 1);
            FX.write('scroll-fallback', function () {
                if (bar) { bar.style.transform = 'scaleX(' + p.toFixed(4) + ')'; }
                if (hc) { hc.style.translate = '0 ' + (-46 * k).toFixed(1) + 'px'; hc.style.opacity = String(1 - .85 * k); }
                if (hv) { hv.style.translate = '0 ' + (54 * k).toFixed(1) + 'px'; }
            });
        });
    }

    /* ---------- hero visibility: pause loops and the network canvas when offscreen ---------- */
    var hero = document.querySelector('.hero');
    var heroVisible = true, heroListeners = [];
    if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
            heroVisible = es[0].isIntersecting;
            hero.classList.toggle('is-off', !heroVisible);
            heroListeners.forEach(function (fn) { fn(); });
        }).observe(hero);
    }

    /* ---------- motion graphic: drifting node network behind the hero ----------
       Canvas 2D, not DOM: ~60 nodes and their links are one bitmap, so there is no layout or
       style cost per frame. Runs its own loop because it draws every frame while visible,
       and stops completely when the hero is offscreen, the tab is hidden, or effects are Lite. */
    function network() {
        var c = document.getElementById('net');
        if (!c || !c.getContext) { return; }
        var ctx = c.getContext('2d');
        var pts = [], w = 0, h = 0, id = 0, running = false;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var LINK = 140, mouse = { x: -9999, y: -9999 };

        function size() {
            var r = c.getBoundingClientRect();
            w = r.width; h = r.height;
            c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var n = Math.max(14, Math.min(64, Math.round(w * h / 21000)));
            pts = [];
            for (var i = 0; i < n; i++) {
                pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: 1 + Math.random() * 1.5 });
            }
            paint();
        }

        function paint() {
            ctx.clearRect(0, 0, w, h);
            var i, j, a, b, dx, dy, d;
            ctx.lineWidth = 1;
            for (i = 0; i < pts.length; i++) {
                a = pts[i];
                for (j = i + 1; j < pts.length; j++) {
                    b = pts[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
                    if (d < LINK * LINK) {
                        ctx.strokeStyle = 'rgba(125,190,255,' + ((1 - Math.sqrt(d) / LINK) * .2).toFixed(3) + ')';
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
                if (d < 190) {                                   // nodes near the pointer link to it
                    ctx.strokeStyle = 'rgba(170,150,255,' + ((1 - d / 190) * .5).toFixed(3) + ')';
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
                ctx.fillStyle = 'rgba(170,215,255,.6)';
                ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
            }
        }

        function tick() {
            id = 0;
            if (!running) { return; }
            for (var i = 0; i < pts.length; i++) {
                var p = pts[i];
                p.x += p.vx; p.y += p.vy;
                if (p.x < -20) { p.x = w + 20; } else if (p.x > w + 20) { p.x = -20; }
                if (p.y < -20) { p.y = h + 20; } else if (p.y > h + 20) { p.y = -20; }
            }
            paint();
            id = requestAnimationFrame(tick);
        }

        function sync() {
            var should = heroVisible && !document.hidden && !lite();
            if (should && !running) { running = true; id = requestAnimationFrame(tick); }
            else if (!should && running) { running = false; if (id) { cancelAnimationFrame(id); id = 0; } }
        }

        var resizeTimer = 0;
        window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); });
        document.addEventListener('visibilitychange', sync);
        heroListeners.push(sync);
        new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-fx'] });
        if (reduceMotion.addEventListener) { reduceMotion.addEventListener('change', sync); }
        if (finePointer.matches && hero) {
            hero.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
            hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
        }
        size();
        sync();
    }

    function init() { setupPointer(); materialise(); network(); }
    // Always after DOMContentLoaded: deferred main.js has rendered the cards by then.
    document.addEventListener('DOMContentLoaded', init);
})();
