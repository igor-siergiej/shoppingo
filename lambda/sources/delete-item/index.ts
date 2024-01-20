import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Item, List } from '../types';

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
        const itemName = event.pathParameters.itemName;
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

        const newList = list.items.filter(
            (item: Item) => item.name !== itemName
        );

        await dynamo.send(
            new UpdateCommand({
                TableName: tableName,
                Key: {
                    name: listName,
                },
                UpdateExpression: 'SET #items = :newItems',
                ExpressionAttributeValues: {
                    ':newItems': newList,
                },
                ExpressionAttributeNames: {
                    '#items': 'items',
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(
                `Removed item: ${itemName} from list: ${listName}`
            ),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
