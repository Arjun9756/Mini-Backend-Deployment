const crypto = require('crypto')
function generateUniqueRandomId(length = 32)
{
    const string = crypto.randomBytes(length).toString('hex')
    return {status:true , _id:string}
}

module.exports = generateUniqueRandomId