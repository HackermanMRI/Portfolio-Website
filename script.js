// This ensures the script runs after the HTML document has been fully loaded.
document.addEventListener('DOMContentLoaded', function() {

    // --- Typing Effect ---
    const typingEffectElement = document.getElementById('typing-effect');
    if (typingEffectElement) {
        const words = ["Frontend Developer", "Cybersecurity Enthusiast", "App Developer", "Tech Explorer"];
        let i = 0;
        let j = 0;
        let currentWord = "";
        let isDeleting = false;

        function type() {
            currentWord = words[i];
            let typeSpeed = isDeleting ? 30 : 31;

            if (isDeleting) {
                // Subtract characters
                typingEffectElement.innerHTML = currentWord.substring(0, j - 1) + '<span class="cursor">|</span>';
                j--;
            } else {
                // Add characters
                typingEffectElement.innerHTML = currentWord.substring(0, j + 1) + '<span class="cursor">|</span>';
                j++;
            }

            // When word is fully typed
            if (!isDeleting && j === currentWord.length) {
                isDeleting = true;
                typeSpeed = 1500; // Pause at end of word
            } 
            // When word is fully deleted
            else if (isDeleting && j === 0) {
                isDeleting = false;
                i = (i + 1) % words.length; // Move to the next word
                typeSpeed = 100; // Pause before new word
            }
            
            setTimeout(type, typeSpeed);
        }
        type();
    }


    // --- Responsive Navigation (Hamburger Menu) ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });
        
        // Close nav when a link is clicked
        document.querySelectorAll('.nav-links li a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('toggle');
                }
            });
        });
    }

    // --- Scroll Animations (Fade-in sections & Animate skills) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Animate skill bars if the skills section is visible
                if (entry.target.id === 'skills') {
                    const progressBars = document.querySelectorAll('.progress');
                    progressBars.forEach(bar => {
                        const targetWidth = bar.getAttribute('data-width');
                        bar.style.width = targetWidth;
                    });
                }
                // We stop observing the element after it has become visible
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // --- Highlight Active Nav Link on Scroll ---
    const allSections = document.querySelectorAll('main section');
    const navLi = document.querySelectorAll('.nav-links li a');

    window.addEventListener('scroll', () => {
        let current = '';
        allSections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLi.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') == '#' + current) {
                a.classList.add('active');
            }
        });
    });

});
