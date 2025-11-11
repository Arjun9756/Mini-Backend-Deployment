const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const verifyToken = require('../Utils Service/TokenVerify')
const pool = require('../SQL Server/Database')
const crypto = require('crypto')
const redisClient = require('../Utils Service/Redi.utils')
const generateUniqueRandomId = require('../Utils Service/IDGenerate.utils')
const {diskUpload , memoryUpload} = require('../Utils Service/Multer.utils')

/**
 * 
 * @param {Object} payload 
 * @returns {Object}
 */

function generateDigitalSign(payload = {})
{
    const signature = crypto.createHmac('sha256' , process.env.CRYPTO_SERVER_SECRET).update(JSON.stringify(payload)).digest('hex')
    return {status:true , signature}
}

/**
 * 
 * @param {String} uid 
 * @param {String} signature 
 * @param {String} signedURL 
 */
async function saveToRedis(uid='' , signature='', signedURL = '')
{
    try{
        await redisClient.set(`user:${uid}:${signedURL}` , signature)
        await redisClient.expire(`user:${uid}:${signedURL}` , 300)
    }catch(error){
        console.log(`Error While Setting Up Key Value For Signed URL ${error.message}`)
    }
}

/**
 * 
 * @param {String} uid 
 * @param {String} signedURL 
 * @returns {Object}
 */
async function getFromRedis(uid='' , signedURL='')
{
    try{
        const data = await redisClient.get(`user:${uid}:${signedURL}`)
        if(data)
            return {status:true , data:userSignedURLData}

        throw new Error("Invalid Key Or Key is Expired")
    }
    catch(error){
        console.log(error.message)
        return {status:false , reason:error.message}
    }
}

/**
 * 
 * @param {Object} payload 
 * @param {String} signature 
 * @returns {Object}
 */
function generateSignedURL(payload = {} , signature = '')
{
    const signedURL = `http://localhost:5000/file-access?uid=${encodeURIComponent(payload.uid)}&path=${encodeURIComponent(payload.path)}&op=${encodeURIComponent(payload.op)}&exp=${encodeURIComponent(payload.exp)}&signature=${encodeURIComponent(signature)}`
    return {status:true , signedURL}
}

async function validateData(redisSignature , payload)
{
    if(payload.signature !== redisSignature){
        return {status:false , reason:"Redis Sign and URL Sign Not Match"}
    }

    let connection;
    try{

        connection = await pool.getConnection()
        const [rows , fields] = await connection.execute('SELECT api_secret_hash FROM api_keys WHERE user_id = ?' , [payload.uid])
        payload['api_secret_hash'] = rows[0].api_secret_hash
        
        const {status , signature} = generateDigitalSign(payload)
        if(signature != redisSignature)
            return {status:false , reason:"Signature Invalid While Cross Check With Database"}
        return {status:true , message:"Signatured Verified"}
    }
    catch(error){
        console.log(`Error While Signature Verification With Cross Check With Database ${error.message}`)
        return {status:false , reason:`Error While Signature Verification With Cross Check With Database ${error.message}`}
    }
    finally{
        if(connection)
            connection.release()
    }
}

router.get('/', (req, res) => {
    return res.status(202).json({
        status: true,
        message: "File.route.js is Working Fine"
    })
})

router.post('/generate-sign-url', verifyToken, async (req, res) => {

    const { fileName, operation } = req.body
    console.log(fileName , operation)

    if (!fileName || !operation || (operation.toLowerCase() !== 'upload' && operation.toLowerCase() !== 'download')) {
        return res.status(401).json({
            status: false,
            message: "File Name and Operation For The File is Required"
        })
    }

    let connection;
    try {
        connection = await pool.getConnection()
        await connection.query('USE MINI_S3_BUCKET')

        const [rows, fields] = await connection.query('SELECT api_secret_hash FROM api_keys WHERE user_id = ?', [req.user._id])
        const filePath = `uploads/${req.user._id}/${Date.now()}/${fileName}`

        const payload = {
            path: filePath,
            op: operation,
            exp: Date.now() + 1000 * 300,    // 5 Minutes,
            uid: req.user._id,
            api_secret_hash:rows[0].api_secret_hash
        }

        // Create Digital Signature Using CryptoGraphy For Signed URL
        const {status , signature} = generateDigitalSign(payload)

        // Generate Signed Url And Send to Frontend
        const {urlStatus , signedURL} = generateSignedURL(payload , signature)
        await saveToRedis(payload.uid , signature , signedURL)

        return res.status(200).json({
            status:true,
            message:"Signed URL Generated Successfuly",
            expireAfter:"5 Minutes",
            signedURL:signedURL,
            digitalSignature:signature
        })
    }
    catch (error) {
        console.log(`Error While Fetching API_SECRET_HASH For Signed URL ${error.message}`)
        return res.status(501).json({
            status:false,
            message:`Error While Fetching API_SECRET_HASH For Signed URL ${error.message}`
        })
    }
    finally{
        if(connection)
            connection.release()
    }
})

router.post('/file-access' , verifyToken ,  diskUpload.single('file') , async (req,res)=>{
    if(req.file){
        return res.status(401).json({
            status:false,
            message:"No File is Found in Our Backend"
        })
    }

    const {uid , op , path , exp , signature} = req.query
    if(!uid || !op || !path || !exp || !signature){
        return res.status(401).json({
            status:false,
            message:"All Field Of Signed URL is Required For Validation"
        })
    }

    //  Fetch Signature form Redis 
    const {status , userSignedURLData , reason} = await getFromRedis(uid , req.originalUrl)
    if(!status){
        return res.status(401).json({
            status:false,
            message:reason
        })
    }

    // Valdate Redis Signature and URL Signature and Database Signature 
    const {status:validationStatus , reason:validationReason , message} = await validateData(userSignedURLData , {uid , op , path , exp})
    if(!validationStatus){
        if(req.query.path && req.file){
            fs.unlinkSync(req.query.path)
        }
        return res.status(401).json({
            status,
            validationReason
        })
    }

    // Save to Database The File Has Been Recorded On Server
    let connection;
    try{
        const {status , _id:uniqueFileID} = generateUniqueRandomId()
        connection = await pool.getConnection()

        const sqlQuery = `INSERT INTO files (id,user_id,filename,storage_path,size,mime_type,shared_with,visibilty) VALUES (?,?,?,?,?,?,?,?)`
        const [rows , fields] = await connection.execute(sqlQuery , [uniqueFileID , req.user._id , req.file.fileName , req.file.path , req.file.size , req.file.mimetype , {} , 'private'])

        if(rows.affectedRows === 0){
            return res.status(501).json({
                status:false,
                message:"SQL Server Issue In Insertion Of File Data"
            })
        }
    }
    catch(error){
        console.log(`SQL Server Issue in Insertion of File Data ${error.message}`)
        return res.status(501).json({
            status:false,
            reason:`SQL Server Issue in Insertion of File Data ${error.message}`
        })
    }
    finally{
        if(connection)
            connection.release()
    }
})
module.exports = router