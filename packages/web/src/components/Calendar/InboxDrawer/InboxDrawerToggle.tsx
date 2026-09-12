import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';

export interface InboxDrawerToggleProps {
    count: number;
    open: boolean;
    onClick: () => void;
}

export const InboxDrawerToggle = ({ count, open, onClick }: InboxDrawerToggleProps) => (
    <button
        type="button"
        data-testid="inbox-toggle"
        className="flex w-full items-center justify-between px-4 py-2"
        onClick={onClick}
    >
        <span className="flex items-center gap-2 text-sm font-medium">
            <Inbox className="h-4 w-4" />
            Inbox ({count})
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
    </button>
);
