import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';

interface ConfirmationDialogProps {
    open: boolean;
    title?: string;
    description?: string;
    cancelLabel?: string;
    actionLabel?: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ConfirmationDialog = ({
    open,
    title,
    description,
    cancelLabel = 'Cancel',
    actionLabel = 'Confirm',
    onCancel,
    onConfirm,
}: ConfirmationDialogProps) => (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
