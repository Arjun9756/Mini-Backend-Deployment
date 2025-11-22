const Valkey = require('ioredis').Redis
const path = require('path')
require('dotenv').config({
    path:path.join(__dirname , '..' , '.env')
})

// Trusting Out The Proxy Server and CDN Servers

const valkey = new Valkey({
    host:process.env.VALKEY_HOST || 'localhost' || '127.0.0.1',
    username:process.env.VALKEY_USER || '',
    port:process.env.VALKEY_PORT || 6379,
    password:process.env.VALKEY_PASSWORD || ''
})

async function userRateLimit(req , res , next){
    const userIPAddress = req.headers['cf-connecting-ip'] || req.ip
    if(userIPAddress){
        return res.status(403).json({
            status:false,
            message:"Unable To Find Out User Actual IP ??"
        })
    }

    try{
        if(!await valkey.get(userIPAddress)){
            await valkey.set(userIPAddress , 1)
            await valkey.expire(userIPAddress , 300) 
        }
        else if(await valkey.get(userIPAddress) === process.env.RATE_LIMIT_THRESHOLD_VAl){
            return res.status(429).json({
                status:false,
                message:"Retry After Sometime"
            })
        }else{
            await valkey.set(userIPAddress , parseInt(await valkey.get(userIPAddress)) + 1)
            next()
        }
    }
    catch(error){
        console.log(`Error In Rate Limiting Service`)
        return res.status(501).json({
            status:false,
            message:error
        })
    }
}

module.exports = userRateLimit