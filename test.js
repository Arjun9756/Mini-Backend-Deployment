const pool = require('./SQL Server/Database')

let connection;
async function fetch2()
{
    connection = await pool.getConnection()
    await connection.query('USE MINI_S3_BUCKET')

    const sqlQuery = `SELECT users.id , users.name , users.email , users.password , api_keys.id as api_unique_id , api_keys.api_key , api_keys.api_secret_hash , api_keys.permission 
                        FROM users INNER JOIN api_keys ON users.id = api_keys.user_id where api_keys.user_id = ?`
    
    const [rows , field] = await connection.query('SELECT users.id , users.name , users.email , users.password , api_keys.id as api_unique_id , api_keys.api_key , api_keys.api_secret_hash , api_keys.permission FROM users INNER JOIN api_keys ON users.id = api_keys.user_id where api_keys.user_id = ?' , ["edfd768148c36670de80c99b101cef44179636fa04b3e962e40bf741e310ecdb"])
    console.log(rows)
    console.log(field)
}

// fetch2()

console.log(decodeURIComponent('uploads%2Fe7e24b6fd63c9183e103865f8a2bfdd7daa0f4a3a590b7f67db9a888bdc181ed%2F1762746661776%2Fprofile.png'))