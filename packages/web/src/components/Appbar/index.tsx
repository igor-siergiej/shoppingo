const Appbar = () => {
    return (
        <header className="bg-background border-b border-border shadow-sm fixed top-0 left-0 right-0 w-full z-50">
            <div className="relative flex items-center justify-center h-16">
                {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                        v{__APP_VERSION__}
                    </span>
                )}
                <h1 className="text-2xl font-bold text-center w-full text-foreground">Shoppingo</h1>
            </div>
        </header>
    );
};

export default Appbar;
