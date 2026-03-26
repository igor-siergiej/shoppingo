import { Download, LogOut, Moon, RefreshCw, Sun, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { useTheme } from '../../../contexts/ThemeContext';
import { usePWA } from '../../../hooks/usePWA';

export interface HamburgerMenuProps {
    currentList?: { title: string; ownerId?: string };
    userId?: string;
    onManageUsers: () => void;
    onClose: () => void;
    onLogout: () => void;
}

export const HamburgerMenu = ({ currentList, userId, onManageUsers, onClose, onLogout }: HamburgerMenuProps) => {
    const { theme, toggleTheme } = useTheme();
    const { canInstall, isInstalled, hasUpdate, installApp, updateApp } = usePWA();

    const handleInstall = async () => {
        const success = await installApp();
        if (success) {
            onClose();
        }
    };

    const handleUpdate = async () => {
        onClose();
        await updateApp();
    };

    return (
        <div className="flex flex-col gap-2.5">
            {/* Manage Users action */}
            {currentList && currentList.ownerId === userId && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.2 }}
                >
                    <Button
                        variant="outline"
                        onClick={onManageUsers}
                        className="w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-slate-50 active:scale-95"
                    >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                    </Button>
                </motion.div>
            )}

            {/* Dark Mode Toggle */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    delay: currentList && currentList.ownerId === userId ? 0.1 : 0.05,
                    duration: 0.2,
                }}
            >
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                >
                    <div className="flex items-center gap-3">
                        {theme === 'dark' ? (
                            <Moon className="h-4 w-4 text-slate-600" />
                        ) : (
                            <Sun className="h-4 w-4 text-slate-600" />
                        )}
                        <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                </button>
            </motion.div>

            {/* Update available action */}
            {hasUpdate && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                >
                    <Button
                        variant="outline"
                        onClick={handleUpdate}
                        className="w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-slate-50 active:scale-95"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Update available
                    </Button>
                </motion.div>
            )}

            {/* Install app action */}
            {canInstall && !isInstalled && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                >
                    <Button
                        variant="outline"
                        onClick={handleInstall}
                        className="w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-slate-50 active:scale-95"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Install app
                    </Button>
                </motion.div>
            )}

            {/* Logout button */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
            >
                <Button
                    variant="destructive"
                    onClick={onLogout}
                    className="w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-red-600 active:scale-95"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                </Button>
            </motion.div>
        </div>
    );
};
