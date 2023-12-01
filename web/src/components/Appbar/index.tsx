import { Box, Toolbar, AppBar, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { green } from '@mui/material/colors';

function Appbar() {
    return (
        <>
            <Box
                sx={{
                    flexGrow: 1,
                    mb: '0.5em',
                }}
            >
                <AppBar
                    position="static"
                    sx={{
                        backgroundColor: green[400],
                        textAlign: 'center',
                    }}
                >
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
