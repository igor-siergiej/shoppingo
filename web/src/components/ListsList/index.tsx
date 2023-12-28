import { Box, IconButton, Divider, Button } from '@mui/material';
import { deleteList } from '../../api';
import ClearIcon from '@mui/icons-material/Clear';
import { List } from '../../types';
import { ListsListProps } from './types';
import { useNavigate } from 'react-router-dom';

const ListsList = ({ lists, refetch }: ListsListProps) => {
    const navigate = useNavigate();
    const renderedOutput = lists.map((list: List) => (
        <Box
            key={list.name}
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pb: '0.5em',
            }}
        >
            <Button
                onClick={() => {
                    navigate(`/list/${list.name}`);
                }}
            >
                {list.name}
            </Button>

            <IconButton
                sx={{}}
                color="inherit"
                onClick={async () => {
                    await deleteList(list.name);
                    refetch();
                }}
            >
                <ClearIcon />
            </IconButton>
            <Divider />
        </Box>
    ));
    return renderedOutput;
};

export default ListsList;
