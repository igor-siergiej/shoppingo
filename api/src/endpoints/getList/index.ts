import { Request, Response } from "express";
import { DependencyContainer } from "../../lib/dependencyContainer";
import { DependencyToken } from "../../lib/dependencyContainer/types";
import { CollectionName } from "../../database/types";

const getList = async (req: Request, res: Response) => {
    const { name } = req?.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    //TODO: do some actual error handling maybe lol

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOne({ name });

    res.send(list).status(200);
}

export default getList;
