// Minimal PWA registration
export function registerPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered successfully:', registration);
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        });
    }
}

// Listen for install prompt
export function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('Install prompt triggered');
        e.preventDefault();
        (window as any).deferredPrompt = e;
    });
}
