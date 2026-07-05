import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@shoppingo/web';

export const Confirm = () => (
    <AlertDialog open>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete “Groceries”?</AlertDialogTitle>
                <AlertDialogDescription>
                    This removes the list and its 12 items for everyone it’s shared with. This can’t be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete list</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
