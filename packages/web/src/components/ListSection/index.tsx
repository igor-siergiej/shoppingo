import type { ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';

interface ListSectionProps {
    title: string;
    hasItems: boolean;
    emptyIcon: ReactNode;
    emptyTitle: string;
    emptyDescription: string;
    children: ReactNode;
}

export const ListSection = ({
    title,
    hasItems,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    children,
}: ListSectionProps) => (
    <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
        {hasItems ? (
            children
        ) : (
            <Empty className="flex-none justify-start p-4">
                <EmptyHeader>
                    <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
                    <EmptyTitle>{emptyTitle}</EmptyTitle>
                    <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        )}
    </div>
);
