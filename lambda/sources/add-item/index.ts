import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { List } from '../types';

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = 'lists';

export const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
    };
    try {
        const requestJSON = JSON.parse(event.body);
        const listName = event.pathParameters.name;

        const getList = await dynamo.send(
            new GetCommand({
                TableName: tableName,
                Key: {
                    name: listName,
                },
            })
        );

        const list = getList.Item as List;

        const itemToAdd = {
            name: requestJSON.itemName,
            dateAdded: requestJSON.dateAdded,
            isSelected: false,
        };

        list.items.push(itemToAdd);

        await dynamo.send(
            new UpdateCommand({
                TableName: tableName,
                Key: {
                    name: listName,
                },
                UpdateExpression: 'SET #items = :newItems',
                ExpressionAttributeValues: {
                    ':newItems': list.items,
                },
                ExpressionAttributeNames: {
                    '#items': 'items',
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(
                `Added item: ${requestJSON.itemName} to list: ${listName}`
            ),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
