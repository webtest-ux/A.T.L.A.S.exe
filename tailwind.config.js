window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                space: {
                    950: '#02050B',
                    900: '#0B1220',
                    800: '#142238',
                    700: '#1E3252',
                },
                navy: { deep: '#020817', midnight: '#061329', panel: '#091A33', elevated: '#0D213D' }
            }
        }
    }
};
