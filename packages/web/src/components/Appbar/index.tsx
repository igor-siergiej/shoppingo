import { Box, Toolbar, AppBar, Typography, Button } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import logo from '../../../iconLogo.png';
import { AppbarProps } from './types';

const Appbar = ({ handleClearSelected, handleRemoveAll, handleGoToListsScreen }: AppbarProps) => {
    return (
        <>
            <Box>
                <AppBar>
                    <Toolbar>
                        {handleGoToListsScreen
                            ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            handleGoToListsScreen();
                                        }}
                                    >
                                        Go Back
                                    </Button>
                                )
                            : (
                                    <img
                                        src={logo}
                                        alt="App Logo"
                                        height={40}
                                        width={40}
                                    />
                                )}

                        <Typography
                            variant="h5"
                            sx={{
                                pt: '0.25em',
                                flexGrow: 1,
                                textAlign: 'center',
                            }}
                        >
                            Shoppingo
                        </Typography>

                        {handleRemoveAll && (
                            <IconButton
                                color="inherit"
                                onClick={() => {
                                    handleRemoveAll();
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}

                        {handleClearSelected && (
                            <IconButton
                                color="inherit"
                                onClick={() => {
                                    handleClearSelected();
                                }}
                            >
                                <RemoveDoneIcon />
                            </IconButton>
                        )}
                    </Toolbar>
                </AppBar>
            </Box>
        </>
    );
};

export default Appbar;
