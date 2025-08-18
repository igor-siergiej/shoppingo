import 'dotenv/config';

import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Application } from 'express';

import { registerDepdendencies } from './dependencies';
import addItem from './endpoints/addItem';
import addList from './endpoints/addList';
import clearList from './endpoints/clearList';
import deleteSelected from './endpoints/deleteChecked';
import deleteItem from './endpoints/deleteItem';
import deleteList from './endpoints/deleteList';
import getList from './endpoints/getList';
import getLists from './endpoints/getLists';
import updateItem from './endpoints/updateItem';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';

const port = process.env.PORT;

const allowedOrigins: Array<string> = [
    'https://shoppingo.imapps.co.uk',
    'http://shoppingo.imapps.staging',
    'http://localhost:4000',
];

const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            callback(null, true);

            return;
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

export const onStartup = async () => {
    try {
        const app: Application = express();

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        if (!database) {
            throw new Error('Database dependency not found');
        }

        await database.connect();

        app.use(cors(corsOptions));
        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true,
            })
        );

        // API routes
        app.get('/api/lists/:title', getList);
        app.get('/api/lists/:userId', getLists);
        app.delete('/api/lists/:title', deleteList);
        app.put('/api/lists', addList);

        app.put('/api/lists/:title/items', addItem);

        app.post('/api/lists/:title/items/:itemName', updateItem);

        app.delete('/api/lists/:title/items/:itemName', deleteItem);

        app.delete('/api/lists/:title/clear', clearList);

        app.delete('/api/lists/:title/clearSelected', deleteSelected);

        app.listen(port, () => {
            console.log(`Shoppingo API server running on port ${port}`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
