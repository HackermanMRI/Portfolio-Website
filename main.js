/* ============================================================
   MAIN — renders content.js into the page and drives the motion.
   Used by index.html and project.html.
   Security note: nothing here uses innerHTML. All text goes through
   textContent and all URLs through safeUrl(), so data in content.js
   can never inject markup or script.
   ============================================================ */
(function () {
    'use strict';

    const DATA = window.PORTFOLIO;
    if (!DATA) return;

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    /* ---------- helpers ---------- */

    /** Only https: links are allowed through. Anything else becomes null. */
    function safeUrl(value) {
        try {
            const u = new URL(value, location.href);
            return u.protocol === 'https:' ? u.href : null;
        } catch (_) { return null; }
    }

    /** Relative asset paths only (no scheme, no protocol-relative, no traversal). */
    function safePath(value) {
        return typeof value === 'string' && /^[\w][\w\-./]*$/.test(value) && !value.includes('..') ? value : null;
    }

    function el(tag, props, children) {
        const node = document.createElement(tag);
        if (props) {
            for (const [k, v] of Object.entries(props)) {
                if (v == null || v === false) continue;
                if (k === 'class') node.className = v;
                else if (k === 'text') node.textContent = v;
                else if (k === 'vars') for (const [name, val] of Object.entries(v)) node.style.setProperty(name, val);
                else node.setAttribute(k, v);
            }
        }
        (children || []).forEach(c => c && node.append(c));
        return node;
    }

    function icon(id, cls) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', cls || 'ic');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', '#' + id);
        svg.append(use);
        return svg;
    }

    function externalLink(url, label, iconId, extraClass) {
        const href = safeUrl(url);
        if (!href) return null;
        return el('a', {
            class: 'icon-link glass-chip' + (extraClass ? ' ' + extraClass : ''),
            href, target: '_blank', rel: 'noopener noreferrer',
        }, [icon(iconId), document.createTextNode(label)]);
    }

    function chips(list) {
        return el('ul', { class: 'chips', 'aria-label': 'Technologies' },
            list.map(t => el('li', { class: 'chip', text: t })));
    }

    /* ---------- render: timelines, projects, skills ---------- */

    function timelineItem(entry, i) {
        return el('li', { class: 't-item glass reveal', 'data-i': String(Math.min(i, 4)) }, [
            el('span', { class: 't-dot', 'aria-hidden': 'true' }),
            el('p',  { class: 't-date',  text: entry.date }),
            el('h4', { class: 't-title', text: entry.title }),
            el('p',  { class: 't-org',   text: entry.org }),
            el('p',  { class: 't-text',  text: entry.text }),
        ]);
    }

    function renderTimeline(id, entries) {
        const list = document.getElementById(id);
        if (list) entries.forEach((e, i) => list.append(timelineItem(e, i)));
    }

    function projectCard(p, i) {
        const imgPath = safePath(p.cover);
        const cover = imgPath
            ? el('div', { class: 'cover' }, [
                el('img', { src: imgPath, alt: p.title + ' app preview', width: '450', height: '470', loading: 'lazy', decoding: 'async' }),
              ])
            : el('div', { class: 'cover cover--gen', vars: { '--hue': String(Number(p.hue) || 210) }, 'aria-hidden': 'true' }, [
                el('span', { text: p.title.replace(/^\W*(3D\s+)?/i, '').charAt(0).toUpperCase() }),
              ]);

        const links = el('div', { class: 'p-links' });
        const gh = externalLink(p.github, 'Source', 'i-github');
        if (gh) { gh.setAttribute('aria-label', p.title + ' source code on GitHub'); links.append(gh); }
        const demo = externalLink(p.demo, 'Live demo', 'i-arrow');
        if (demo) { demo.setAttribute('aria-label', p.title + ' live demo'); links.append(demo); }

        return el('article', { class: 'p-card glass tilt reveal', 'data-i': String(i % 2 + 1) }, [
            cover,
            el('div', { class: 'p-body' }, [
                el('p',  { class: 'p-kind', text: p.kind }),
                el('h3', { class: 'p-title' }, [
                    el('a', { href: 'project.html?id=' + encodeURIComponent(p.id), text: p.title }),
                ]),
                el('p', { class: 'p-sum', text: p.summary }),
                chips(p.stack),
                links,
            ]),
        ]);
    }

    function renderProjects() {
        const grid = document.getElementById('project-grid');
        if (!grid) return;
        $('noscript', grid)?.remove();
        DATA.projects.forEach((p, i) => grid.append(projectCard(p, i)));
    }

    function renderSkills() {
        const box = document.getElementById('skill-list');
        if (!box) return;
        $('noscript', box)?.remove();
        let k = 0;
        DATA.skills.forEach(group => {
            box.append(el('div', { class: 'skill-row' }, [
                el('p', { class: 'skill-group', text: group.group }),
                el('ul', { class: 'skill-items' }, group.items.map(name =>
                    el('li', { class: 'skill', text: name, vars: { '--k': String(k++) } }))),
            ]));
        });
    }

    /* ---------- project detail page (project.html?id=...) ---------- */

    function renderProjectPage() {
        const root = document.getElementById('project-root');
        if (!root) return;

        // Whitelist lookup: the id from the URL is only ever compared, never inserted.
        const id = new URLSearchParams(location.search).get('id');
        const idx = DATA.projects.findIndex(p => p.id === id);
        root.textContent = '';

        if (idx === -1) {
            document.title = 'Project not found | Mrinmoy Dewan';
            root.append(
                el('h1', { text: 'Project not found' }),
                el('p', { class: 'lede', text: 'That project does not exist. Pick one from the list.' }),
                el('div', { class: 'page-cta' }, [el('a', { class: 'btn btn-primary', href: 'index.html#projects', text: 'Back to projects' })])
            );
            return;
        }

        const p = DATA.projects[idx];
        document.title = p.title + ' | Mrinmoy Dewan';
        const metaDesc = $('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', p.summary);

        const cta = el('div', { class: 'page-cta' });
        const gh = safeUrl(p.github);
        if (gh) cta.append(el('a', { class: 'btn btn-primary magnetic', href: gh, target: '_blank', rel: 'noopener noreferrer' }, [
            icon('i-github'), el('span', { text: 'View source' })]));
        const demo = safeUrl(p.demo);
        if (demo) cta.append(el('a', { class: 'btn btn-glass magnetic', href: demo, target: '_blank', rel: 'noopener noreferrer' }, [
            el('span', { text: 'Live demo' }), icon('i-arrow')]));

        root.append(
            el('a', { class: 'back', href: 'index.html#projects' }, [icon('i-back'), el('span', { text: 'All projects' })]),
            el('p', { class: 'p-kind reveal', text: p.kind }),
            el('h1', { class: 'reveal', 'data-i': '1', text: p.title }),
            el('p', { class: 'lede reveal', 'data-i': '2', text: p.summary }),
            cta,
            el('div', { class: 'detail' }, [
                el('div', { class: 'detail-copy reveal', 'data-i': '3' }, p.details.map(t => el('p', { text: t }))),
                el('dl', { class: 'facts glass reveal', 'data-i': '4' }, [
                    el('div', {}, [el('dt', { text: 'Type' }),  el('dd', { text: p.kind })]),
                    el('div', {}, [el('dt', { text: 'Built with' }), el('dd', { text: p.stack.join(', ') })]),
                ]),
            ])
        );

        const shots = (p.gallery || []).map(safePath).filter(Boolean);
        if (shots.length) {
            root.append(el('div', { class: 'gallery', role: 'region', 'aria-label': p.title + ' screenshots', tabindex: '0' },
                shots.map((src, n) => el('figure', { class: 'glass' }, [
                    el('img', { src, alt: p.title + ' screen ' + (n + 1) + ' of ' + shots.length, width: '576', height: '1280', loading: 'lazy', decoding: 'async' }),
                ]))));
        }

        const prev = DATA.projects[(idx - 1 + DATA.projects.length) % DATA.projects.length];
        const next = DATA.projects[(idx + 1) % DATA.projects.length];
        const pager = (proj, label) => el('a', { class: 'glass', href: 'project.html?id=' + encodeURIComponent(proj.id) }, [
            el('small', { text: label }), el('b', { text: proj.title })]);
        root.append(el('nav', { class: 'pager', 'aria-label': 'More projects' }, [pager(prev, 'Previous'), pager(next, 'Next')]));
    }

    renderTimeline('leadership-list', DATA.leadership);
    renderTimeline('education-list', DATA.education);
    renderProjects();
    renderSkills();
    renderProjectPage();

    /* ---------- hero: split the name into characters for the entrance ---------- */
    (function splitName() {
        let n = 0;
        $$('[data-split]').forEach(line => {
            const text = line.textContent;
            line.textContent = '';
            Array.from(text).forEach(ch => line.append(el('span', { class: 'ch', text: ch, vars: { '--n': String(n++) } })));
        });
    })();

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------- scroll reveals ---------- */
    (function reveals() {
        const items = $$('.reveal');
        if (!items.length) return;
        if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('in')); return; }
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                e.target.classList.add('in');
                io.unobserve(e.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach(i => io.observe(i));

        // Skills: stagger chips in once their container is visible
        const skills = document.getElementById('skill-list');
        if (skills) new IntersectionObserver((es, o) => es.forEach(e => {
            if (e.isIntersecting) { skills.classList.add('in'); o.disconnect(); }
        }), { threshold: 0.15 }).observe(skills);
    })();

    /* ---------- nav: scrolled state, indicator, scroll-spy, mobile menu ---------- */
    (function nav() {
        const navEl   = $('.nav');
        const list    = document.getElementById('nav-links');
        const btn     = $('.menu-btn');
        if (!navEl || !list) return;

        const links    = $$('a[href^="#"]', list);
        const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);

        function moveIndicator(active) {
            if (!active || getComputedStyle(btn).display !== 'none') { list.style.setProperty('--ind-o', '0'); return; }
            list.style.setProperty('--ind-x', active.offsetLeft + 'px');
            list.style.setProperty('--ind-w', active.offsetWidth + 'px');
            list.style.setProperty('--ind-o', '1');
        }
        let current = null;
        function setActive(link) {
            current = link;
            links.forEach(a => a === link ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
            moveIndicator(link);
        }

        if ('IntersectionObserver' in window && sections.length) {
            const spy = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) setActive(links.find(a => a.getAttribute('href') === '#' + e.target.id));
                });
            }, { rootMargin: '-42% 0px -52% 0px' });
            sections.forEach(s => spy.observe(s));
            const top = document.getElementById('top');
            if (top) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(null); }),
                { rootMargin: '-40% 0px -50% 0px' }).observe(top);
        }
        window.addEventListener('resize', () => moveIndicator(current), { passive: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveIndicator(current));

        if (!btn) return;
        function setOpen(open, returnFocus) {
            list.classList.toggle('open', open);
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            if (!open && returnFocus) btn.focus();
        }
        btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
        links.forEach(a => a.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && list.classList.contains('open')) setOpen(false, true); });
        document.addEventListener('pointerdown', e => {
            if (list.classList.contains('open') && !navEl.contains(e.target)) setOpen(false);
        });
    })();

    /* ---------- scroll-linked: progress bar, nav shadow, timeline lines ---------- */
    (function scrollLinked() {
        const bar = $('.progress span');
        const navEl = $('.nav');
        const lines = $$('.timeline');
        let ticking = false;

        function update() {
            ticking = false;
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
            if (navEl) navEl.classList.toggle('is-scrolled', y > 12);
            lines.forEach(tl => {
                const r = tl.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (window.innerHeight * 0.75 - r.top) / r.height));
                tl.style.setProperty('--line', reduceMotion ? '1' : p.toFixed(3));
            });
        }
        window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    })();

    /* ---------- pointer effects: glass sheen, card tilt, magnetic buttons, aurora parallax ---------- */
    (function pointerFx() {
        if (!finePointer) return;

        let target = null, raf = 0, last = null;
        const MAX_TILT = 7;

        function frame() {
            raf = 0;
            if (!last || !target) return;
            const r = target.getBoundingClientRect();
            const x = last.clientX - r.left, y = last.clientY - r.top;
            target.style.setProperty('--mx', x + 'px');
            target.style.setProperty('--my', y + 'px');
            if (!reduceMotion && target.classList.contains('tilt')) {
                target.classList.add('is-moving');
                target.style.setProperty('--ry', ((x / r.width - .5) * 2 * MAX_TILT).toFixed(2) + 'deg');
                target.style.setProperty('--rx', ((.5 - y / r.height) * 2 * MAX_TILT).toFixed(2) + 'deg');
            }
        }
        function release(node) {
            if (!node) return;
            node.classList.remove('is-moving');
            node.style.setProperty('--rx', '0deg');
            node.style.setProperty('--ry', '0deg');
        }

        document.addEventListener('pointermove', e => {
            last = e;
            const glass = e.target instanceof Element ? e.target.closest('.glass') : null;
            if (glass !== target) { release(target); target = glass; }
            if (target && !raf) raf = requestAnimationFrame(frame);

            // aurora parallax: tiny, eased by CSS transform on the container
            if (!reduceMotion) {
                const aurora = $('.aurora');
                if (aurora) {
                    aurora.style.setProperty('translate',
                        ((e.clientX / innerWidth - .5) * -26).toFixed(1) + 'px ' + ((e.clientY / innerHeight - .5) * -26).toFixed(1) + 'px');
                }
            }
        }, { passive: true });
        document.addEventListener('pointerleave', () => { release(target); target = null; });

        // Magnetic buttons
        if (!reduceMotion) {
            $$('.magnetic').forEach(b => {
                b.addEventListener('pointermove', e => {
                    const r = b.getBoundingClientRect();
                    b.style.translate = ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .32).toFixed(1) + 'px';
                });
                b.addEventListener('pointerleave', () => { b.style.translate = ''; });
            });
        }
    })();

    /* ---------- copy email ---------- */
    (function copyEmail() {
        const btn = document.getElementById('copy-email');
        if (!btn) return;
        const label = $('span', btn);
        const status = document.getElementById('copy-status');
        let timer;

        async function copy(text) {
            if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
            const ta = el('textarea', { readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
            ta.value = text;
            document.body.append(ta); ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            if (!ok) throw new Error('copy failed');
        }

        btn.addEventListener('click', async () => {
            const original = 'Copy email';
            try {
                await copy(btn.dataset.email);
                label.textContent = 'Copied';
                if (status) status.textContent = 'Email address copied to clipboard';
            } catch (_) {
                label.textContent = 'Press Ctrl+C';
                if (status) status.textContent = 'Could not copy. Use the email link instead.';
            }
            clearTimeout(timer);
            timer = setTimeout(() => { label.textContent = original; }, 2200);
        });
    })();
})();
