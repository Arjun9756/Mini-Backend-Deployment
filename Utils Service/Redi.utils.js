const path = require('path')
require('dotenv').config({path:path.join(__dirname , '..' , '.env')})
const {Redis} = require('ioredis')

const redis = new Redis({
    username:process.env.REDIS_USERNAME,
    password:process.env.REDIS_PASSWORD,
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT
})

module.exports = redis