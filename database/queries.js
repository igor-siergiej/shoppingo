const Pool = require('pg').Pool
const pool = new Pool({
    user: 'vsodxfgu',
    host: 'flora.db.elephantsql.com',
    database: 'vsodxfgu',
    password: 'etOosYmOwhp8TR2UQ99Sg-iXen6GOqWk',
    port: 5432,
})

const getUsers = (request, response) => {
    pool.query(`
    SELECT json_build_object(
        'itemName', items.item_name,
        'isSelected', items.is_selected
    ) FROM shopping_list.items;`
        , (error, results) => {
            if (error) {
                throw error
            }
            response.status(200).json(results.rows)
        })
}



module.exports = {
    getUsers
}