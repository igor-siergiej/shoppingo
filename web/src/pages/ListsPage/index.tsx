import { useQuery } from 'react-query';
import {
    CircularProgress,
    FormGroup,
    Toolbar,
    Typography,
} from '@mui/material';
import { addList, getListsQuery } from '../../api';
import Appbar from '../../components/Appbar';
import NewItemForm from '../../components/NewItemForm';
import ListsList from '../../components/ListsList';

const ListsPage = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(),
    });

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    if (isLoading) {
        return <CircularProgress />;
    }

    return (
        <>
            <Appbar />
            <Toolbar />
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                {data ? (
                    <ListsList lists={data} refetch={refetch} />
                ) : (
                    <Typography
                        sx={{ textAlign: 'center', pb: '1em', pt: '1em' }}
                    >
                        This list is empty...
                    </Typography>
                )}
            </FormGroup>

            <NewItemForm
                handleAdd={async (listName) => {
                    await addList(listName);
                    await refetch();
                }}
            />
        </>
    );
};

export default ListsPage;
