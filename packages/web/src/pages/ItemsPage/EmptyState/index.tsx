import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { ListTodo, ShoppingCart } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../../components/ui/empty';

interface EmptyStateProps {
    listType: ListType;
}

const emptyStateConfig = {
    [ListTypeEnum.SHOPPING]: {
        icon: ShoppingCart,
        title: 'No items yet',
        description: 'Start adding items to your shopping list',
    },
    [ListTypeEnum.TODO]: {
        icon: ListTodo,
        title: 'No tasks yet',
        description: 'Start adding tasks to your to-do list',
    },
};

export const EmptyState = ({ listType }: EmptyStateProps) => {
    const config = emptyStateConfig[listType];

    return (
        <Empty className="flex-none justify-start p-4">
            <EmptyHeader>
                <EmptyMedia variant="icon">{config && <config.icon />}</EmptyMedia>
                <EmptyTitle>{config?.title}</EmptyTitle>
                <EmptyDescription>{config?.description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
};
