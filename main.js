/* main.js — renders content.js into the page and wires up the UI.
 * Works on index.html and project.html. Text goes in with textContent only (never innerHTML),
 * and every URL passes through safeUrl()/safePath(), so content cannot inject markup.
 */
(function () {
    'use strict';

    var D = window.PORTFOLIO;
    if (!D) { return; }

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    /* ---------- helpers ---------- */
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) { n.className = cls; }
        if (text != null) { n.textContent = text; }
        return n;
    }
    function icon(name, cls) {
        var s = document.createElementNS(SVG_NS, 'svg');
        s.setAttribute('class', cls || 'ic');
        s.setAttribute('aria-hidden', 'true');
        var u = document.createElementNS(SVG_NS, 'use');
        u.setAttribute('href', '#i-' + name);
        s.appendChild(u);
        return s;
    }
    function safeUrl(u) {                       // https only: blocks javascript:, data:, http:
        try { var p = new URL(u, location.href); return p.protocol === 'https:' ? p.href : null; } catch (e) { return null; }
    }
    function safePath(p) {                      // same-site relative path only
        return typeof p === 'string' && /^[\w\-./]+$/.test(p) && p.indexOf('..') === -1 ? p : null;
    }
    function link(cls, href, label, ic, ext) {
        var a = el('a', cls);
        a.href = href;
        if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        if (ic) { a.appendChild(icon(ic)); }
        a.appendChild(el('span', null, label));
        return a;
    }
    function vtName(id) { return 'cover-' + id.replace(/[^\w-]/g, ''); }

    function coverEl(p, cls) {
        var wrap = el('div', 'cover' + (cls ? ' ' + cls : ''));
        var src = safePath(p.cover);
        if (src) {
            var img = new Image();
            img.src = src; img.alt = ''; img.decoding = 'async';
            wrap.appendChild(img);
        } else {
            wrap.classList.add('cover--gen');
            wrap.style.setProperty('--hue', String(Number(p.hue) || 220));
            wrap.appendChild(el('span', null, p.title.charAt(0)));
        }
        wrap.style.viewTransitionName = vtName(p.id);     // shared element: card cover morphs into the page hero
        return wrap;
    }

    /* ---------- hero: split into letters (aria-hidden lines; the h1 keeps its accessible text) ---------- */
    function splitHero() {
        var n = 0;
        $$('[data-split]').forEach(function (line) {
            var t = line.textContent; line.textContent = '';
            Array.prototype.forEach.call(t, function (c) {
                var s = el('span', 'ch', c); s.style.setProperty('--n', String(n++)); line.appendChild(s);
            });
        });
    }

    /* ---------- headings: wrap each word so it can rise out of a mask (text stays readable to screen readers) ---------- */
    function splitWords() {
        $$('.h2').forEach(function (h) {
            var words = h.textContent.trim().split(/\s+/);
            h.textContent = '';
            words.forEach(function (word, i) {
                var w = el('span', 'w');
                var inner = el('span', null, word);
                inner.style.setProperty('--w', String(i));
                w.appendChild(inner);
                h.appendChild(w);
                if (i < words.length - 1) { h.appendChild(document.createTextNode(' ')); }
            });
        });
    }

    /* ---------- decorative skills ticker: two identical sets per row so the loop is seamless ---------- */
    function renderTicker(host) {
        if (!host) { return; }
        var names = [];
        D.skills.forEach(function (g) { g.items.forEach(function (n) { names.push(n); }); });
        $$('.ticker-row', host).forEach(function (row, r) {
            var list = r ? names.slice().reverse() : names;
            for (var copy = 0; copy < 2; copy++) {
                var set = el('div', 'ticker-set');
                list.forEach(function (n) { set.appendChild(el('span', 'tick', n)); });
                row.appendChild(set);
            }
        });
    }

    /* ---------- experience: collapsible groups ----------
       Each group is a native <details> in index.html, so it is keyboard and screen-reader
       accessible and still opens without JavaScript. Here we only fill the rows and the
       one-line preview shown on the closed summary. */
    var GROUP_NOUN = { leadership: ['role', 'roles'], education: ['entry', 'entries'], work: ['role', 'roles'] };

    function renderGroups() {
        $$('details[data-list]').forEach(function (det) {
            var key = det.getAttribute('data-list');
            var items = Array.isArray(D[key]) ? D[key] : [];
            var body = $('.acc-body', det), meta = $('.acc-meta', det), count = $('.acc-count', det);
            var noun = GROUP_NOUN[key] || ['item', 'items'];

            if (!items.length) {
                det.classList.add('acc--empty');
                meta.textContent = 'Open to full-time roles';
                count.textContent = 'Soon';
                var empty = el('li', 'row row--empty');
                empty.appendChild(el('p', null, 'No roles listed yet. I am looking for my first full-time position in software or security.'));
                var cta = link('glass-btn', '#contact', 'Get in touch', 'mail');
                empty.appendChild(cta);
                body.appendChild(empty);
                return;
            }

            var first = items[0];
            meta.textContent = first.title + ', ' + first.org;
            count.textContent = items.length + ' ' + noun[items.length === 1 ? 0 : 1];

            items.forEach(function (it, i) {
                var li = el('li', 'row');
                li.style.setProperty('--r', String(i));
                li.appendChild(el('p', 'row-date', it.date));
                var main = el('div', 'row-main');
                main.appendChild(el('h4', 'row-title', it.title));
                main.appendChild(el('p', 'row-org', it.org));
                if (it.text) { main.appendChild(el('p', 'row-text', it.text)); }
                li.appendChild(main);
                body.appendChild(li);
            });
        });
    }

    /* ---------- projects: compact grid, category filter, "show all" ---------- */
    var CATEGORY_LABEL = { web: 'Web', android: 'Android', games: 'Games', utilities: 'Utilities', desktop: 'Desktop', security: 'Security', design: 'Design' };
    function catKey(p) { return String(p.category || 'other').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'other'; }
    function catLabel(k) { return CATEGORY_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1); }

    function renderProjects(host) {
        if (!host) { return; }
        D.projects.forEach(function (p, i) {
            var cell = el('li', 'p-cell');
            cell.setAttribute('data-cat', catKey(p));
            cell.style.setProperty('--vt', 'card-' + vtName(p.id).slice(6));   // used only while filtering

            var card = el('article', 'p-card surface tilt reveal');
            card.setAttribute('data-i', String(i % 3));
            card.appendChild(coverEl(p));

            var body = el('div', 'p-body');
            var top = el('p', 'p-kind');
            top.appendChild(el('span', 'p-cat', catLabel(catKey(p))));
            var label = catLabel(catKey(p));
            if (p.kind && p.kind.toLowerCase().indexOf(label.toLowerCase()) === -1) { top.appendChild(el('span', null, p.kind)); }   // skip "Android app" under an "Android" pill
            body.appendChild(top);

            var h = el('h3', 'p-title');
            var a = el('a', null, p.title);
            a.href = 'project.html?id=' + encodeURIComponent(p.id);
            h.appendChild(a);
            body.appendChild(h);
            body.appendChild(el('p', 'p-sum', p.summary));

            var foot = el('div', 'p-foot');
            var chips = el('ul', 'chips');
            p.stack.slice(0, 3).forEach(function (s) { chips.appendChild(el('li', 'chip', s)); });
            if (p.stack.length > 3) { chips.appendChild(el('li', 'chip chip--more', '+' + (p.stack.length - 3))); }
            foot.appendChild(chips);
            var gh = safeUrl(p.github);
            if (gh) {
                var src = link('p-src', gh, 'Source', 'github', true);
                src.setAttribute('aria-label', p.title + ' source code on GitHub');
                foot.appendChild(src);
            }
            body.appendChild(foot);

            card.appendChild(body);
            cell.appendChild(card);
            host.appendChild(cell);
        });
        setupProjectFilter(host);
    }

    function setupProjectFilter(grid) {
        var bar = $('#project-filter'), more = $('#project-more'), status = $('#filter-status');
        if (!bar || !more) { return; }
        var cells = $$('.p-cell', grid);
        var small = window.matchMedia('(max-width: 760px)');
        var state = { cat: 'all', expanded: false };

        /* pills: "All" plus every category that has at least one project, biggest first */
        var counts = {};
        cells.forEach(function (c) { var k = c.getAttribute('data-cat'); counts[k] = (counts[k] || 0) + 1; });
        var cats = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x] || x.localeCompare(y); });
        var pills = [['all', 'All', cells.length]].concat(cats.map(function (k) { return [k, catLabel(k), counts[k]]; }));
        if (cats.length < 2) { bar.hidden = true; }

        var ind = $('.filter-ind', bar);
        var buttons = pills.map(function (pdef) {
            var b = el('button', 'filter-btn');
            b.type = 'button';
            b.setAttribute('data-cat', pdef[0]);
            b.appendChild(el('span', null, pdef[1]));
            b.appendChild(el('span', 'filter-n', String(pdef[2])));
            b.addEventListener('click', function () {
                if (state.cat === pdef[0]) { return; }
                state.cat = pdef[0]; state.expanded = false;
                apply(true);
            });
            bar.appendChild(b);
            return b;
        });

        /* arrow keys move between pills (one tab stop for the whole group) */
        bar.addEventListener('keydown', function (e) {
            var i = buttons.indexOf(document.activeElement);
            if (i < 0) { return; }
            var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
            if (j === -1 && e.key !== 'ArrowLeft') { return; }
            e.preventDefault();
            j = (j + buttons.length) % buttons.length;
            buttons[j].focus(); buttons[j].click();
        });

        more.addEventListener('click', function () {
            state.expanded = !state.expanded;
            apply(true);
            if (!state.expanded) {
                var top = grid.getBoundingClientRect().top;
                if (top < 0) { grid.scrollIntoView({ block: 'start', behavior: window.FX && FX.lite() ? 'auto' : 'smooth' }); }
            }
        });

        function placeIndicator(b) {
            if (!ind || !b) { return; }
            ind.style.setProperty('--x', b.offsetLeft + 'px');
            ind.style.setProperty('--w', b.offsetWidth + 'px');
        }

        function render(fromUser) {
            var limit = small.matches ? 4 : 6;
            var matching = cells.filter(function (c) { return state.cat === 'all' || c.getAttribute('data-cat') === state.cat; });
            var shown = state.expanded ? matching.length : Math.min(limit, matching.length);
            cells.forEach(function (c) { c.hidden = true; });
            matching.forEach(function (c, i) {
                c.hidden = i >= shown;
                if (!c.hidden && fromUser) { c.firstChild.classList.add('in'); }   // user is looking at the grid: skip the scroll reveal
            });
            buttons.forEach(function (b) {
                var on = b.getAttribute('data-cat') === state.cat;
                b.setAttribute('aria-pressed', String(on));
                b.tabIndex = on ? 0 : -1;
                if (on) { placeIndicator(b); }
            });
            var hiddenCount = matching.length - shown;
            more.hidden = matching.length <= limit;
            more.textContent = state.expanded ? 'Show fewer' : 'Show all ' + matching.length + ' projects (' + hiddenCount + ' more)';
            more.setAttribute('aria-expanded', String(state.expanded));
            if (status && fromUser) { status.textContent = 'Showing ' + shown + ' of ' + matching.length + (state.cat === 'all' ? ' projects' : ' ' + catLabel(state.cat) + ' projects'); }
        }

        /* animate the change with a View Transition where supported: cards slide to their new
           slots, leaving cards fade out, new ones fade in. Elsewhere the change is instant. */
        function apply(animate) {
            var canVT = animate && document.startViewTransition && !(window.FX && FX.lite());
            if (!canVT) { render(animate); return; }
            grid.classList.add('is-filtering');
            var t = document.startViewTransition(function () { render(true); });
            t.finished.finally(function () { grid.classList.remove('is-filtering'); });
        }

        if (small.addEventListener) { small.addEventListener('change', function () { render(false); }); }
        window.addEventListener('resize', function () { placeIndicator(buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0]); });
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { apply(false); }); }
        apply(false);
    }

    function renderSkills(host) {
        if (!host) { return; }
        var k = 0;
        D.skills.forEach(function (g) {
            var row = el('div', 'skill-row');
            row.appendChild(el('p', 'skill-group', g.group));
            var items = el('ul', 'skill-items');
            g.items.forEach(function (name) {
                var li = el('li', 'skill', name);
                li.style.setProperty('--k', String(k++));
                items.appendChild(li);
            });
            row.appendChild(items);
            host.appendChild(row);
        });
    }

    /* ---------- project page ---------- */
    function renderProjectPage(root) {
        var id = new URLSearchParams(location.search).get('id');
        var idx = D.projects.findIndex(function (p) { return p.id === id; });   // whitelist compare, id is never inserted anywhere
        var back = link('back', 'index.html#projects', 'All projects', 'back');
        back.addEventListener('click', function (e) {          // keep scroll position when we came from the portfolio
            try {
                var ref = document.referrer && new URL(document.referrer);
                if (ref && ref.origin === location.origin && !/project\.html$/.test(ref.pathname) && history.length > 1) { e.preventDefault(); history.back(); }
            } catch (err) { /* fall through to the normal link */ }
        });
        root.appendChild(back);

        if (idx < 0) {
            document.title = 'Project not found | Mrinmoy Dewan';
            root.appendChild(el('h1', null, 'Project not found'));
            root.appendChild(el('p', 'lede', 'That link does not match any project.'));
            var cta = el('div', 'page-cta');
            cta.appendChild(link('btn btn-primary', 'index.html#projects', 'See all projects', 'arrow'));
            root.appendChild(cta);
            return;
        }

        var p = D.projects[idx];
        document.title = p.title + ' | Mrinmoy Dewan';
        root.appendChild(el('p', 'p-kind hero-in', p.kind));
        var h1 = el('h1', 'hero-in', p.title); h1.setAttribute('data-d', '1'); root.appendChild(h1);
        var lede = el('p', 'lede hero-in', p.summary); lede.setAttribute('data-d', '2'); root.appendChild(lede);

        var actions = el('div', 'page-cta');
        var gh = safeUrl(p.github), demo = safeUrl(p.demo);
        if (gh) { actions.appendChild(link('btn btn-primary magnetic', gh, 'View source on GitHub', 'github', true)); }
        if (demo) { actions.appendChild(link('btn btn-glass glass magnetic', demo, 'Live demo', 'arrow', true)); }
        root.appendChild(actions);

        root.appendChild(coverEl(p, 'p-hero'));

        var detail = el('div', 'detail');
        var copy = el('div', 'detail-copy reveal');
        p.details.forEach(function (t) { copy.appendChild(el('p', null, t)); });
        detail.appendChild(copy);

        var facts = el('dl', 'facts surface reveal'); facts.setAttribute('data-i', '1');
        [['Type', p.kind], ['Stack', p.stack.join(', ')]].forEach(function (r) {
            var d = el('div'); d.appendChild(el('dt', null, r[0])); d.appendChild(el('dd', null, r[1])); facts.appendChild(d);
        });
        detail.appendChild(facts);
        root.appendChild(detail);

        var shots = (p.gallery || []).map(safePath).filter(Boolean);
        if (shots.length) {
            var g = el('div', 'gallery reveal');
            g.setAttribute('role', 'region'); g.setAttribute('aria-label', p.title + ' screenshots'); g.tabIndex = 0;
            shots.forEach(function (s, i) {
                var f = el('figure', 'surface');
                var img = new Image();
                img.src = s; img.alt = p.title + ' screenshot ' + (i + 1); img.loading = 'lazy'; img.decoding = 'async';
                f.appendChild(img); g.appendChild(f);
            });
            root.appendChild(g);
        }

        var pager = el('nav', 'pager reveal'); pager.setAttribute('aria-label', 'More projects');
        var prev = D.projects[idx - 1], next = D.projects[idx + 1];
        [[prev, 'Previous'], [next, 'Next']].forEach(function (pair, i) {
            if (!pair[0]) { if (i === 1 && !prev) { return; } return; }
            var a = el('a', 'surface');
            a.href = 'project.html?id=' + encodeURIComponent(pair[0].id);
            a.appendChild(el('small', null, pair[1]));
            a.appendChild(el('b', null, pair[0].title));
            pager.appendChild(a);
        });
        if (pager.children.length) { root.appendChild(pager); }
    }

    /* ---------- reveal: one observer, entries processed as a batch so each batch staggers ---------- */
    function observeReveals() {
        var items = $$('.reveal');
        if (!items.length) { return; }
        if (!('IntersectionObserver' in window)) { items.forEach(function (n) { n.classList.add('in'); }); return; }
        var io = new IntersectionObserver(function (entries) {
            var batch = entries.filter(function (e) { return e.isIntersecting; })
                .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
            batch.forEach(function (e, i) {
                e.target.style.setProperty('--b', String(i));
                e.target.classList.add('in');
                io.unobserve(e.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        items.forEach(function (n) { io.observe(n); });
    }

    /* ---------- navigation: scroll-spy, sliding indicators, dock behaviour ---------- */
    function setupNav() {
        var navLinks = $$('#nav-links a');
        var dock = $('#dock');
        var dockLinks = dock ? $$('a', dock) : [];
        var navInd = $('.nav-ind'), dockLens = $('.dock-lens');
        if (!navLinks.length && !dockLinks.length) { return; }

        function put(ind, a, vx, vw, vo) {
            if (!ind) { return; }
            if (!a || !a.offsetWidth) { ind.style.setProperty(vo, '0'); return; }
            ind.style.setProperty(vx, a.offsetLeft + 'px');
            ind.style.setProperty(vw, a.offsetWidth + 'px');
            ind.style.setProperty(vo, '1');
        }
        var current = '';
        function mark(id) {
            current = id;
            document.body.dataset.section = id;
            var n = null, d = null;
            navLinks.forEach(function (a) {
                if (a.getAttribute('href') === '#' + id) { a.setAttribute('aria-current', 'true'); n = a; } else { a.removeAttribute('aria-current'); }
            });
            dockLinks.forEach(function (a) {
                if (a.getAttribute('href') === '#' + id) { a.setAttribute('aria-current', 'true'); d = a; } else { a.removeAttribute('aria-current'); }
            });
            put(navInd, n, '--ind-x', '--ind-w', '--ind-o');
            put(dockLens, d, '--x', '--w', '--o');
        }

        if ('IntersectionObserver' in window) {
            var spy = new IntersectionObserver(function (es) {
                es.forEach(function (e) { if (e.isIntersecting) { mark(e.target.id === 'top' ? '' : e.target.id); } });
            }, { rootMargin: '-45% 0px -50% 0px' });
            $$('main section[id]').forEach(function (s) { spy.observe(s); });
        }
        window.addEventListener('resize', function () { mark(current); });
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { mark(current); }); }

        /* dock: minimise while scrolling down (like the iOS tab bar), expand on scroll up / touch */
        if (dock && window.FX) {
            var lastY = window.scrollY;
            FX.scroll(function (y) {
                var dy = y - lastY;
                if (Math.abs(dy) < 8) { return; }
                FX.write('dock', function () { dock.classList.toggle('min', dy > 0 && y > 120); });
                lastY = y;
            });
            dock.addEventListener('pointerdown', function () { dock.classList.remove('min'); });
            dock.addEventListener('click', function (e) {
                if (e.target.closest('a') && navigator.vibrate) { try { navigator.vibrate(6); } catch (err) { /* unsupported */ } }
            });
        }
    }

    /* ---------- Effects toggle (Safari has no prefers-reduced-transparency, so users get a control) ---------- */
    function setupEffects() {
        var btn = $('#fx-toggle');
        if (!btn) { return; }
        var label = $('span', btn);
        function paint() {
            var full = document.documentElement.getAttribute('data-fx') !== 'lite';
            btn.setAttribute('aria-pressed', String(full));
            if (label) { label.textContent = 'Effects: ' + (full ? 'Full' : 'Lite'); }
        }
        btn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-fx') === 'lite' ? 'full' : 'lite';
            document.documentElement.setAttribute('data-fx', next);
            try { localStorage.setItem('fx', next); } catch (e) { /* storage blocked */ }
            paint();
        });
        paint();
    }

    function setupCopy() {
        var btn = $('#copy-email'), status = $('#copy-status');
        if (!btn) { return; }
        var label = $('span', btn), original = label ? label.textContent : '';
        btn.addEventListener('click', function () {
            var email = btn.getAttribute('data-email') || D.person.email;
            function done(ok) {
                if (label) { label.textContent = ok ? 'Copied' : 'Copy failed'; }
                if (status && fromUser) { status.textContent = ok ? 'Email address copied' : 'Could not copy the email address'; }
                setTimeout(function () { if (label) { label.textContent = original; } }, 1800);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); }); } else { done(false); }
        });
    }

    function ready() {
        var y = $('#year'); if (y) { y.textContent = String(new Date().getFullYear()); }
        observeReveals();
        setupNav();
        setupEffects();
        setupCopy();
    }

    /* page assembly */
    var isProject = !!$('#project-root');
    if (isProject) {
        renderProjectPage($('#project-root'));
    } else {
        splitHero();
        splitWords();
        renderTicker($('#ticker'));
        renderGroups();
        renderProjects($('#project-grid'));
        renderSkills($('#skill-list'));
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ready); } else { ready(); }
})();
