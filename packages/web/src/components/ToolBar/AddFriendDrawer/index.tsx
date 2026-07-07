import { UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../../../components/ui/drawer';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../../components/ui/input-otp';
import { useGenerateFriendCode, useRedeemFriendCode } from '../../../hooks/useFriends';
import { ToolBarButton } from '../ToolBarButton';

export interface AddFriendDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Mode = 'invite' | 'enter';

const OTP_LENGTH = 6;
const CLOSE_DELAY_MS = 900;

const formatCountdown = (secondsLeft: number): string => {
    if (secondsLeft <= 0) return 'Expired';
    const mm = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, '0');
    const ss = (secondsLeft % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
};

export const AddFriendDrawer = ({ open, onOpenChange }: AddFriendDrawerProps) => {
    const [mode, setMode] = useState<Mode>('invite');
    const [otp, setOtp] = useState('');
    const [copyFeedback, setCopyFeedback] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [redeemSuccess, setRedeemSuccess] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const {
        mutate: generateCode,
        data: generated,
        isLoading: isGenerating,
        reset: resetGenerate,
    } = useGenerateFriendCode();

    const {
        mutate: redeemCode,
        isLoading: isRedeeming,
        error: redeemError,
        isError: isRedeemError,
        reset: resetRedeem,
    } = useRedeemFriendCode();

    // Live mm:ss countdown to the code's expiry; re-derives on each tick from expiresAt
    // rather than counting down a stored duration, so it self-corrects if the tab was backgrounded.
    useEffect(() => {
        if (!generated?.expiresAt) return;
        const expiresAt = new Date(generated.expiresAt).getTime();

        const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [generated?.expiresAt]);

    useEffect(
        () => () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        },
        []
    );

    const resetAll = () => {
        setMode('invite');
        setOtp('');
        setCopyFeedback('');
        setRedeemSuccess(false);
        resetGenerate();
        resetRedeem();
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) resetAll();
        onOpenChange(next);
    };

    const handleSwitchMode = (next: Mode) => {
        setMode(next);
        setOtp('');
        resetRedeem();
    };

    const handleShare = async () => {
        if (!generated) return;
        if (navigator.share) {
            try {
                await navigator.share({ text: generated.code });
                return;
            } catch {
                // user cancelled or share unsupported at runtime — fall back to clipboard
            }
        }
        await navigator.clipboard.writeText(generated.code);
        setCopyFeedback('Copied to clipboard');
    };

    const handleCopy = async () => {
        if (!generated) return;
        await navigator.clipboard.writeText(generated.code);
        setCopyFeedback('Copied!');
    };

    const handleRedeem = () => {
        if (otp.length !== OTP_LENGTH) return;
        redeemCode(otp, {
            onSuccess: () => {
                setRedeemSuccess(true);
                closeTimeoutRef.current = setTimeout(() => handleOpenChange(false), CLOSE_DELAY_MS);
            },
        });
    };

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerTrigger asChild>
                <ToolBarButton icon={UserPlus} title="Add friend" onClick={() => handleOpenChange(true)} />
            </DrawerTrigger>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Add Friend</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-6 space-y-4">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={mode === 'invite' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => handleSwitchMode('invite')}
                            >
                                Invite
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'enter' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => handleSwitchMode('enter')}
                            >
                                Enter code
                            </Button>
                        </div>

                        {mode === 'invite' ? (
                            !generated ? (
                                <Button className="w-full" disabled={isGenerating} onClick={() => generateCode()}>
                                    {isGenerating ? 'Generating…' : 'Invite a friend'}
                                </Button>
                            ) : (
                                <div className="space-y-3 text-center">
                                    <p className="font-mono text-3xl tracking-widest">{generated.code}</p>
                                    <p className="text-sm text-muted-foreground">{formatCountdown(secondsLeft)}</p>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="flex-1" onClick={handleShare}>
                                            Share code
                                        </Button>
                                        <Button variant="outline" className="flex-1" onClick={handleCopy}>
                                            Copy
                                        </Button>
                                    </div>
                                    {copyFeedback && <p className="text-sm text-muted-foreground">{copyFeedback}</p>}
                                </div>
                            )
                        ) : redeemSuccess ? (
                            <p className="text-center text-sm text-primary">Friend added!</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-center">
                                    <InputOTP maxLength={OTP_LENGTH} value={otp} onChange={setOtp}>
                                        <InputOTPGroup>
                                            {[0, 1, 2, 3, 4, 5].map((slotIndex) => (
                                                <InputOTPSlot key={slotIndex} index={slotIndex} />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                                {isRedeemError && redeemError instanceof Error && (
                                    <p className="text-center text-sm text-destructive">{redeemError.message}</p>
                                )}
                                <Button
                                    className="w-full"
                                    disabled={otp.length !== OTP_LENGTH || isRedeeming}
                                    onClick={handleRedeem}
                                >
                                    {isRedeeming ? 'Adding…' : 'Add friend'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
