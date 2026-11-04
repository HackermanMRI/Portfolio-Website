/* ============================================================
   CONTENT — the only file you need to edit to update the site.
   ------------------------------------------------------------
   - Plain data, no HTML. Text is inserted with textContent, so
     characters like < and & are safe.
   - Links must start with https:// (anything else is ignored).
   - To add an entry, copy an existing object and change values.
   ============================================================ */
window.PORTFOLIO = {

    person: {
        name: 'Mrinmoy Dewan',
        email: 'mrinmoylax01@gmail.com',
        github: 'https://github.com/HackermanMRI',
        linkedin: 'https://www.linkedin.com/in/mrinmoydewan',
        cv: 'assets/Mrinmoy-Dewan-CV.pdf',
        location: 'Narayanganj, Bangladesh',
    },

    /* Newest first. */
    education: [
        {
            title: 'B.Sc. in Computer Science & Engineering',
            org: 'Jagannath University, Dhaka',
            date: '2020 – Present',
            text: 'Data Structures, Algorithms, Cybersecurity, Software Engineering, Computer Networks.',
        },
        {
            title: 'Higher Secondary Certificate (HSC)',
            org: 'St. Joseph Higher Secondary School, Dhaka',
            date: '2019 – 2020',
            text: 'Science group. GPA 5.00 / 5.00.',
        },
    ],

    /* Leadership and volunteering, newest first. */
    leadership: [
        {
            title: 'Vice Chair',
            org: 'IEEE Computer Society, JnU Student Branch Chapter',
            date: '2024 – 2025',
            text: 'Led the executive committee and coordinated multiple national-level tech events.',
        },
        {
            title: 'Graphics Designer',
            org: 'IEEE Computer Society Bangladesh Chapter, Team SPARK',
            date: '2023 – 2024',
            text: 'Designed promotional material for national-level IEEE events across Bangladesh.',
        },
        {
            title: 'Webmaster',
            org: 'IEEE Computer Society, JnU Student Branch Chapter',
            date: '2023 – 2024',
            text: 'Maintained the chapter website: content updates, security audits and accessibility improvements.',
        },
        {
            title: 'Graphics Coordinator',
            org: 'IEEE Jagannath University Student Branch',
            date: '2022 – 2023',
            text: 'Led the visual design team for university-wide IEEE events and branding.',
        },
        {
            title: 'Sub-Executive',
            org: 'Jagannath University IT Society (JnUITS)',
            date: '2022 – 2025',
            text: 'Organised workshops, managed teams and ran large-scale IT events.',
        },
    ],

    /* cover: image path, or null to show a generated cover.
       hue: 0-360, only used for generated covers.
       gallery: list of image paths (optional).
       demo: https:// link, or null (the button is hidden when null). */
    projects: [
        {
            id: 'systemedge',
            title: 'SystemEdge',
            kind: 'Android app',
            summary: 'An Android app that tests and benchmarks the hardware inside a smartphone.',
            details: [
                'SystemEdge reads live system data from the device and shows it on one dashboard: RAM usage over time, per-core CPU frequency and temperature, storage, battery voltage and temperature, network ping and speed, and the number of installed apps and sensors.',
                'Separate screens cover device, software and connectivity details.',
            ],
            stack: ['Java', 'Android Studio', 'XML'],
            github: 'https://github.com/HackermanMRI/SystemEdge',
            demo: null,
            cover: 'assets/systemedge-cover.webp',
            hue: 205,
            gallery: [1, 2, 3, 4, 5, 6, 7, 8].map(
                n => `images/systemedge/screen-${n}.webp`
            ),
        },
        {
            id: 'lifelink',
            title: 'LifeLink',
            kind: 'Web app',
            summary: 'A web platform for managing medical services, appointments and patient records.',
            details: [
                'LifeLink is a front-end for booking medical services and managing appointments and patient records, built with HTML, CSS and JavaScript.',
            ],
            stack: ['HTML', 'CSS', 'JavaScript'],
            github: 'https://github.com/HackermanMRI/LifeLink',
            demo: null,
            cover: 'assets/lifelink-cover.webp',
            hue: 215,
            gallery: [],
        },
        {
            id: 'streamora',
            title: 'Streamora',
            kind: 'Android app',
            summary: 'An Android game-streaming app with an interactive, user-friendly interface.',
            details: [
                'Streamora is an Android application for game streaming, built in Java with XML layouts.',
            ],
            stack: ['Java', 'Android Studio', 'XML'],
            github: 'https://github.com/HackermanMRI/Streamora',
            demo: null,
            cover: null,
            hue: 265,
            gallery: [],
        },
        {
            id: 'rubiks-cube',
            title: "3D Rubik's Cube Simulator",
            kind: 'Desktop app',
            summary: "A 3D Rubik's Cube in Python that you can rotate, scramble and solve in real time.",
            details: [
                "An interactive 3D simulation of a Rubik's Cube built with Python and the Ursina engine.",
            ],
            stack: ['Python', 'Ursina'],
            github: 'https://github.com/HackermanMRI/Rubics-Cube',
            demo: null,
            cover: null,
            hue: 160,
            gallery: [],
        },
    ],

    skills: [
        { group: 'Languages',      items: ['C', 'C++', 'Python', 'Java', 'JavaScript'] },
        { group: 'Web',            items: ['HTML', 'CSS'] },
        { group: 'Data',           items: ['MySQL', 'Firebase'] },
        { group: 'Tools',          items: ['GitHub', 'Linux (Ubuntu)', 'Kali Linux', 'Android Studio', 'VS Code'] },
        { group: 'Design',         items: ['Photoshop', 'Illustrator', 'After Effects', 'Canva'] },
    ],
};
