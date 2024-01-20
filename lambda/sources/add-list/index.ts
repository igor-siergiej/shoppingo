import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

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
        await dynamo.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    name: requestJSON.name,
                    dateAdded: requestJSON.dateAdded,
                    items: [],
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(`Added list: ${requestJSON.name}`),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
