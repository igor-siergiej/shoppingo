import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';

const Appbar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    return (
        <header className="bg-primary text-primary-foreground shadow-md">
            <div className="w-full px-4">
                <div className="flex items-center justify-between h-16">
                    <h1 className="text-2xl font-bold">
                        Shoppingo
                    </h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="text-primary-foreground hover:bg-primary-foreground/10"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default Appbar;
