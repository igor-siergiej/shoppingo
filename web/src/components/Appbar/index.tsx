import { Box, Toolbar, AppBar, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

function Appbar() {
    return (
        <>
            <Box>
                <AppBar>
                    <Toolbar>
                        <Typography variant="h5" sx={{ flexGrow: 1 }}>
                            Shoppingo
                        </Typography>
                        <IconButton color="inherit">
                            <DeleteIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
            </Box>
        </>
    );
}

export default Appbar;
