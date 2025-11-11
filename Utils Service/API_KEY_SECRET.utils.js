const crypto = require('crypto')
const bcrypt = require('bcryptjs')

async function generateAPI_KEY_API_SECRET()
{
    const api_key = `key_${crypto.randomBytes(16).toString('hex')}`
    const apiSecretRaw = crypto.randomBytes(32).toString('hex')
    const apiSecretHash = await bcrypt.hash(apiSecretRaw , 10)

    return {status:true , api_key , apiSecretHash , apiSecretRaw}
}

module.exports = generateAPI_KEY_API_SECRET