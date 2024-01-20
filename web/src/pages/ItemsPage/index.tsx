import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
    CircularProgress,
    FormGroup,
    Toolbar,
    Typography,
} from '@mui/material';
import { addItem, clearList, getListQuery } from '../../api';
import Appbar from '../../components/Appbar';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import NewItemForm from '../../components/NewItemForm';

const ItemsPage = () => {
    const { listName } = useParams();
    const navigate = useNavigate();

    if (!listName) {
        return <div>Need a valid list name</div>;
    }

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listName),
    });

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    if (isLoading || !data) {
        return <CircularProgress />;
    }

    const handleClearList = async () => {
        await clearList(listName);
        await refetch();
    };

    return (
        <>
            <Appbar
                handleRemoveAll={handleClearList}
                handleGoToListsScreen={() => {
                    navigate('/');
                }}
            />
            <Toolbar />
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                {data.length > 0 ? (
                    <ItemCheckBoxList
                        items={data}
                        refetch={refetch}
                        listName={listName}
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
                    await addItem(itemName, listName);
                    await refetch();
                }}
            />
        </>
    );
};

export default ItemsPage;
