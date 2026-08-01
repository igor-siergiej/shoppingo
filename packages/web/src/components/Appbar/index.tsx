import { SyncStatusBadge } from '../SyncStatusBadge';

const Appbar = () => {
    return (
        <header className="bg-primary shadow-md fixed top-0 left-0 right-0 w-full z-50">
            <div className="flex items-center justify-between h-14 md:h-16 px-3">
                <div className="flex items-center gap-2">
                    <img src="/logo-192.png" alt="Shoppingo" className="h-9 w-9 md:h-11 md:w-11 rounded-md" />
                    <div className="flex flex-col items-start justify-center leading-none">
                        <span className="text-lg md:text-xl font-bold text-white">Shoppingo</span>
                        {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                            <span className="text-[10px] text-white/70 select-none mt-0.5">v{__APP_VERSION__}</span>
                        )}
                    </div>
                </div>
                <SyncStatusBadge />
            </div>
        </header>
    );
};

export default Appbar;
