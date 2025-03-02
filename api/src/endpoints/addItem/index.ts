import { Request, Response } from "express";
import { DependencyContainer } from "../../lib/dependencyContainer";
import { DependencyToken } from "../../lib/dependencyContainer/types";
import { CollectionName } from "../../database/types";

const addItem = async (req: Request, res: Response) => {
    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    console.log('database:')

    //TODO: do some actual error handling maybe lol

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOne({ name });

    console.log(list)
    res.send(list).status(200);
}

export default addItem;
