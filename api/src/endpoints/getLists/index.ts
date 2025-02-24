import { Request, Response } from "express";

const getLists = async (req: Request, res: Response) => {
  const database = req.app.locals.database
  console.log(database)
  const collection = database.collection('lists');
  const results = await collection.find({}).toArray();
  res.send(results).status(200)
}

export default getLists;
