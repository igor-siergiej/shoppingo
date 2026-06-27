import { Bell, BellRing, Download, Loader2, LogOut, Moon, RefreshCw, Sun, Tag, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { runDailyReminder } from '../../../api';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { useTheme } from '../../../contexts/ThemeContext';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { usePWA } from '../../../hooks/usePWA';

export interface HamburgerMenuProps {
    currentList?: { title: string; ownerId?: string };
    userId?: string;
    onManageUsers: () => void;
    onManageLabels?: () => void;
    onClose: () => void;
    onLogout: () => void;
}

interface MenuItemProps {
    children: ReactNode;
    delay?: number;
}

const MenuItem = ({ children, delay = 0.05 }: MenuItemProps) => (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.2 }}>
        {children}
    </motion.div>
);

const OUTLINE_BTN =
    'w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-slate-50 active:scale-95';

interface SimpleButtonItem {
    show: boolean;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    delay?: number;
}

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
        >
            <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-4 w-4 text-slate-600" /> : <Sun className="h-4 w-4 text-slate-600" />}
                <span className="text-sm font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </button>
    );
};

const NotificationToggle = () => {
    const { isSupported, isSubscribed, isBusy, subscribe, unsubscribe } = usePushNotifications();
    if (!isSupported) return null;

    const handleToggle = () => {
        if (isBusy) return;
        void (isSubscribed ? unsubscribe() : subscribe());
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isBusy}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
        >
            <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium">Notifications</span>
            </div>
            <Switch checked={isSubscribed} onCheckedChange={handleToggle} disabled={isBusy} />
        </button>
    );
};

const TestReminderButton = () => {
    const { isSupported, isSubscribed } = usePushNotifications();
    const [isSending, setIsSending] = useState(false);
    if (!isSupported || !isSubscribed) return null;

    const handleClick = async () => {
        if (isSending) return;
        setIsSending(true);
        try {
            const r = await runDailyReminder();
            if (!r.configured) {
                toast.error('Push not configured on the server (VAPID keys missing).', {
                    style: { backgroundColor: '#ef4444', color: '#ffffff' },
                });
            } else if (r.due === 0) {
                toast('No todos due today — nothing to send.');
            } else if (r.subscriptions === 0) {
                toast.warning('1+ todos due, but no devices subscribed. Enable notifications on this device.');
            } else {
                toast.success(`Sent ${r.sent}/${r.subscriptions} push · ${r.due} due across ${r.owners} owner(s).`);
            }
        } catch {
            toast.error('Failed to trigger reminder', {
                style: { backgroundColor: '#ef4444', color: '#ffffff' },
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Button variant="outline" onClick={() => void handleClick()} disabled={isSending} className={OUTLINE_BTN}>
            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
            Send test reminder
        </Button>
    );
};

interface UpdateButtonProps {
    hasUpdate: boolean;
    isCheckingForUpdate: boolean;
    onUpdate: () => void;
    onCheck: () => void;
}

const UpdateButton = ({ hasUpdate, isCheckingForUpdate, onUpdate, onCheck }: UpdateButtonProps) => {
    if (hasUpdate) {
        return (
            <Button variant="outline" onClick={onUpdate} className={OUTLINE_BTN}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update available
            </Button>
        );
    }
    return (
        <Button variant="outline" onClick={onCheck} disabled={isCheckingForUpdate} className={OUTLINE_BTN}>
            {isCheckingForUpdate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isCheckingForUpdate ? 'Checking...' : 'Check for updates'}
        </Button>
    );
};

export const HamburgerMenu = ({
    currentList,
    userId,
    onManageUsers,
    onManageLabels,
    onClose,
    onLogout,
}: HamburgerMenuProps) => {
    const { canInstall, isInstalled, hasUpdate, installApp, updateApp, checkForUpdate, isCheckingForUpdate } = usePWA();
    const isOwner = !!(currentList && currentList.ownerId === userId);

    const handleInstall = async () => {
        const success = await installApp();
        if (success) onClose();
    };

    const handleUpdate = async () => {
        onClose();
        await updateApp();
    };

    const conditionalButtons: SimpleButtonItem[] = [
        {
            show: isOwner,
            label: 'Manage Users',
            icon: <Users className="h-4 w-4 mr-2" />,
            onClick: onManageUsers,
        },
        {
            show: !!onManageLabels,
            label: 'Manage Labels',
            icon: <Tag className="h-4 w-4 mr-2" />,
            onClick: () => onManageLabels?.(),
        },
        {
            show: canInstall && !isInstalled,
            label: 'Install app',
            icon: <Download className="h-4 w-4 mr-2" />,
            onClick: handleInstall,
            delay: 0.1,
        },
    ];

    return (
        <div className="flex flex-col gap-2.5">
            {conditionalButtons
                .filter((item) => item.show)
                .map((item) => (
                    <MenuItem key={item.label} delay={item.delay}>
                        <Button variant="outline" onClick={item.onClick} className={OUTLINE_BTN}>
                            {item.icon}
                            {item.label}
                        </Button>
                    </MenuItem>
                ))}

            <MenuItem delay={isOwner ? 0.1 : 0.05}>
                <ThemeToggle />
            </MenuItem>

            <MenuItem delay={0.1}>
                <NotificationToggle />
            </MenuItem>

            <MenuItem delay={0.1}>
                <TestReminderButton />
            </MenuItem>

            <MenuItem delay={0.1}>
                <UpdateButton
                    hasUpdate={hasUpdate}
                    isCheckingForUpdate={isCheckingForUpdate}
                    onUpdate={handleUpdate}
                    onCheck={() => void checkForUpdate()}
                />
            </MenuItem>

            <MenuItem delay={0.15}>
                <Button
                    variant="destructive"
                    onClick={onLogout}
                    className="w-full justify-center h-9 text-sm font-medium transition-all duration-200 hover:bg-red-600 active:scale-95"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                </Button>
            </MenuItem>
        </div>
    );
};
