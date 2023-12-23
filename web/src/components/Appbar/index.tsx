import { Box, Toolbar, AppBar, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import logo from '../../../iconLogo.png';

export interface AppbarProps {
    handleRemoveAll: () => void;
}

function Appbar({ handleRemoveAll }: AppbarProps) {
    return (
        <>
            <Box>
                <AppBar>
                    <Toolbar>
                        <img src={logo} alt="App Logo" height={40} width={40} />
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

                        <IconButton
                            color="inherit"
                            onClick={() => {
                                handleRemoveAll();
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
            </Box>
        </>
    );
}

export default Appbar;
