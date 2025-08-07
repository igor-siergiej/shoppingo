import { deleteList } from '../../api';
import { X } from 'lucide-react';
import { List } from '@shoppingo/types';
import { ListsListProps } from './types';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ListsList = ({ lists, refetch }: ListsListProps) => {
    const navigate = useNavigate();
    const renderedOutput = lists.map((list: List) => (
        <div
            key={list.name}
            className="flex items-center w-full pb-2"
        >
            <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                    navigate(`/list/${list.name}`);
                }}
            >
                {list.name}
            </Button>

            <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                    await deleteList(list.name);
                    refetch();
                }}
            >
                <X className="h-4 w-4" />
            </Button>
            <div className="border-t border-border w-full mt-2" />
        </div>
    ));
    return renderedOutput;
};

export default ListsList;
