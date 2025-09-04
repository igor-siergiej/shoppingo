const Appbar = () => {
    return (
        <header className="bg-primary text-primary-foreground shadow-md">
            <div className="relative flex items-center justify-center h-16">
                {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-primary-foreground/80 select-none">
                        v
                        {__APP_VERSION__}
                    </span>
                )}
                <h1 className="text-2xl font-bold text-center w-full">
                    Shoppingo
                </h1>
            </div>
        </header>
    );
};

export default Appbar;
