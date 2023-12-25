import { type ReactElement } from 'react';
import { useQuery } from 'react-query';
import {
    CircularProgress,
    FormGroup,
    Toolbar,
    Typography,
} from '@mui/material';
import { getItemsQuery, deleteAll, addItem } from '../../api';
import ItemCheckBoxList from '../ItemCheckBoxList';
import Appbar from '../Appbar';
import NewItemForm from '../NewItemForm';

function App(): ReactElement {
    const { data, isLoading, isError, refetch } = useQuery({
        ...getItemsQuery(),
    });

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    if (isLoading) {
        return <CircularProgress />;
    }

    const handleRemoveAll = async () => {
        await deleteAll();
        await refetch();
    };

    return (
        <>
            <Appbar handleRemoveAll={handleRemoveAll} />
            <Toolbar />
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                {data ? (
                    <ItemCheckBoxList
                        items={data}
                        refetch={refetch}
                    ></ItemCheckBoxList>
                ) : (
                    <Typography
                        sx={{ textAlign: 'center', pb: '1em', pt: '1em' }}
                    >
                        This list is empty...
                    </Typography>
                )}
            </FormGroup>

            <NewItemForm
                handleAdd={async (itemName) => {
                    await addItem(itemName);
                    await refetch();
                }}
            />
        </>
    );
}

export default App;
