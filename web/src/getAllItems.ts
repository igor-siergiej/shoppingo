// import { getClient } from './dbConnection';

// export async function getAllItems() {
//   try {
//     const client = await getClient();
//     const query = {
//       text: 'SELECT get_all_items()'
//     };

//     const result = await client.query(query);
//     console.log(result.rows);
//     await client.end();
//   } catch (error) {
//     console.log(error);
//   }
// }
