import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FormGroup, Toolbar, Typography } from '@mui/material';
import { addItem, clearList, getListQuery } from '../../api';
import Appbar from '../../components/Appbar';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import NewItemForm from '../../components/NewItemForm';
import { Layout } from '../../components/Layout';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const ItemsPage = () => {
    const { listName } = useParams();
    const navigate = useNavigate();

    if (!listName) {
        return <div>Need a valid list name</div>;
    }

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listName),
    });

    const errorPageContent = <div>Error fetching data.</div>;

    const pageContent = (
        <>
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                {data ? (
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

    const handleClearList = async () => {
        await clearList(listName);
        await refetch();
    };

    return (
        <Layout>
            <Appbar
                handleRemoveAll={handleClearList}
                handleGoToListsScreen={() => {
                    navigate('/');
                }}
            />
            <Toolbar />

            {isLoading && <LoadingSkeleton />}
            {isError && errorPageContent}
            {!isLoading && !isError && data && pageContent}
        </Layout>
    );
};

export default ItemsPage;
