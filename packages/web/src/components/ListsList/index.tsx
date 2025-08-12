import { List } from '@shoppingo/types';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { deleteList } from '../../api';
import { ListsListProps } from './types';

const ListsList = ({ lists, refetch }: ListsListProps) => {
    const navigate = useNavigate();
    const renderedOutput = lists.map((list: List) => (
        <Card
            key={list.name}
            className="mb-2 transition-all duration-200 bg-background hover:bg-accent/50 py-0"
        >
            <CardContent className="flex items-center justify-between p-0.5 ">
                <div className="flex-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-left text-base font-medium"
                        onClick={() => {
                            navigate(`/list/${list.name}`);
                        }}
                    >
                        {list.name}
                    </Button>
                </div>

                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                            await deleteList(list.name);
                            refetch();
                        }}
                        className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive"
                    >
                        <X size={24} strokeWidth={1.75} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    ));
    return renderedOutput;
};

export default ListsList;
