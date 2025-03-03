import { Request, Response } from "express";
import { DependencyContainer } from "../../lib/dependencyContainer";
import { CollectionName } from "../../database/types";
import { DependencyToken } from "../../lib/dependencyContainer/types";

const addList = async (req: Request, res: Response) => {
    const { name, dateAdded } = req?.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionName.Lists);

    const result = await collection.insertOne({ name, dateAdded, items: [] });
    res.send(result).status(200);
}

export default addList;
