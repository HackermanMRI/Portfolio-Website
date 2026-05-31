/* ============================================================
   MRINMOY DEWAN — PORTFOLIO SCRIPT
   ============================================================
   SECTIONS:
   1. Matrix Rain Canvas
   2. Typing Effect
   3. Navbar: scroll state + hamburger + active links
   4. Scroll Animations (IntersectionObserver)
   5. Active Nav Link tracking on scroll
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

    /* ============================================================
       1. MATRIX RAIN CANVAS — Hero background effect
          To adjust: change CHARS, COLOR, FONT_SIZE, or DENSITY
       ============================================================ */
    (function initMatrix() {
        const canvas = document.getElementById('matrix-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Customization
        const CHARS      = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ01アイウエ10マミムメモャユョラリルレロワヲン';
        const COLOR      = '#00c8ff';     // matches --accent
        const FONT_SIZE  = 13;
        const DENSITY    = 0.975;         // higher = more columns stay lit (0.9–0.99)
        const SPEED_MS   = 55;            // lower = faster rain

        let cols, drops;

        function resize() {
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            cols  = Math.floor(canvas.width / FONT_SIZE);
            drops = Array(cols).fill(1);
        }

        function draw() {
            // Semi-transparent black — controls fade trail length
            ctx.fillStyle = 'rgba(4, 13, 24, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = COLOR;
            ctx.font      = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

            for (let i = 0; i < drops.length; i++) {
                const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
                ctx.fillText(ch, i * FONT_SIZE, drops[i] * FONT_SIZE);

                if (drops[i] * FONT_SIZE > canvas.height && Math.random() > DENSITY) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        resize();
        window.addEventListener('resize', resize);
        setInterval(draw, SPEED_MS);
    })();


    /* ============================================================
       2. TYPING EFFECT — Hero subtitle
          TO EDIT WORDS: update the `words` array below
       ============================================================ */
    (function initTyping() {
        const el = document.getElementById('typing-effect');
        if (!el) return;

        // ← EDIT THESE WORDS to change what cycles in the hero
        const words = [
            'Web Developer',
            'Cybersecurity Enthusiast',
            'App Developer',
            'Tech Explorer',
            'Graphic Designer',
        ];

        let wordIndex   = 0;
        let charIndex   = 0;
        let isDeleting  = false;

        function tick() {
            const word      = words[wordIndex];
            const displayed = isDeleting
                ? word.substring(0, charIndex - 1)
                : word.substring(0, charIndex + 1);

            el.innerHTML = displayed + '<span class="cursor" aria-hidden="true">|</span>';

            if (!isDeleting) charIndex++;
            else charIndex--;

            let delay = isDeleting ? 45 : 80;

            if (!isDeleting && charIndex === word.length) {
                delay      = 1800;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex  = (wordIndex + 1) % words.length;
                delay      = 300;
            }

            setTimeout(tick, delay);
        }

        tick();
    })();


    /* ============================================================
       3. NAVBAR — scroll state, hamburger, close on link click
       ============================================================ */
    (function initNav() {
        const header    = document.querySelector('.header');
        const hamburger = document.querySelector('.hamburger');
        const navLinks  = document.querySelector('.nav-links');

        // Add .scrolled class when user scrolls past 20px
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }, { passive: true });

        // Hamburger toggle
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                hamburger.classList.toggle('toggle');
                // Accessibility: toggle aria-expanded
                const expanded = navLinks.classList.contains('active');
                hamburger.setAttribute('aria-expanded', expanded);
            });

            // Close mobile nav when a link is clicked
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('toggle');
                    hamburger.setAttribute('aria-expanded', 'false');
                });
            });
        }
    })();



    /* ============================================================
       3b. JOURNEY ACCORDION — collapse/expand blocks on click
           All blocks start collapsed (aria-expanded="false").
           Clicking the header toggles open/closed.
           Each body uses max-height transition via .open class.

           TO OPEN A BLOCK BY DEFAULT ON LOAD:
           Find the header's aria-controls value (e.g. "edu-body")
           and add body.classList.add('open') + set aria-expanded
           to 'true' inside the forEach before the event listener.
       ============================================================ */
    (function initJourneyAccordion() {
        const headers = document.querySelectorAll('.journey-block-header');
        if (!headers.length) return;

        headers.forEach(header => {
            const bodyId = header.getAttribute('aria-controls');
            const body   = document.getElementById(bodyId);
            if (!body) return;

            // Enforce closed state on load
            body.classList.remove('open');
            header.setAttribute('aria-expanded', 'false');

            header.addEventListener('click', () => {
                const isOpen = header.getAttribute('aria-expanded') === 'true';

                if (isOpen) {
                    body.classList.remove('open');
                    header.setAttribute('aria-expanded', 'false');
                } else {
                    body.classList.add('open');
                    header.setAttribute('aria-expanded', 'true');
                }
            });
        });
    })();


    /* ============================================================
       4. SCROLL ANIMATIONS — fade sections in as they enter viewport
          Stagger delay is applied per section for a cascade effect
       ============================================================ */
    (function initScrollAnimations() {
        const sections = document.querySelectorAll('section:not(#home)');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root:       null,
            rootMargin: '0px',
            threshold:  0.08,
        });

        sections.forEach(section => observer.observe(section));

        // Hero is always visible — mark it immediately
        const hero = document.getElementById('home');
        if (hero) hero.classList.add('visible');
    })();


    /* ============================================================
       5. ACTIVE NAV LINK — highlight correct link on scroll
       ============================================================ */
    (function initActiveLink() {
        const allSections = document.querySelectorAll('main section[id]');
        const navAnchors  = document.querySelectorAll('.nav-links a');

        function updateActive() {
            let current = '';
            const scrollY = window.scrollY;

            allSections.forEach(section => {
                const top = section.offsetTop - 100;
                if (scrollY >= top) {
                    current = section.getAttribute('id');
                }
            });

            navAnchors.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === '#' + current);
            });
        }

        // Set initial state on load
        updateActive();
        window.addEventListener('scroll', updateActive, { passive: true });
    })();

});