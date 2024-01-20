import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

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
        const list = await dynamo.send(
            new GetCommand({
                TableName: tableName,
                Key: {
                    name: event.pathParameters.name,
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(list.Item.items),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
