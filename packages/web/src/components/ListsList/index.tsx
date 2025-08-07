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
            <div className="flex-1">
                <Button
                    variant="ghost"
                    className="w-full justify-center text-center"
                    onClick={() => {
                        navigate(`/list/${list.name}`);
                    }}
                >
                    {list.name}
                </Button>
            </div>

            <div className="flex items-center pl-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                        await deleteList(list.name);
                        refetch();
                    }}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    ));
    return renderedOutput;
};

export default ListsList;
