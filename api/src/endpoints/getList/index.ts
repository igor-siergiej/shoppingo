import { Request, Response } from "express";

const getList = async (req: Request, res: Response) => {
    const database = req.app.locals.database
    const { listName } = req.params;

    const collection = database.collection('lists');

    const list = await collection.find({ name: listName })

    res.send(list).status(200)
}

export default getList;
