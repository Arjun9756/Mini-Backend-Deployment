const fs = require('fs')
const path = require('path')
const multer = require('multer')

if(!fs.existsSync(path.join(__dirname , '..' , 'uploads'))){
    fs.mkdirSync(path.join(__dirname , '..' , 'uploads') , {
        recursive:true
    })
}

const multerStorage = multer.diskStorage({
    filename:function(req , file , cb){
        const uniqueFileName = Date.now() + file.fieldname
        cb(null , uniqueFileName)
        file.mimetype
    },
    destination:function(req , file , cb){
        const dir = req.query.path
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true })
        }
        cb(null , dir)
    }
})

const memoryStorage = multer.memoryStorage()

const diskUpload = multer({storage:multerStorage})
const memoryUpload = multer({storage:memoryStorage})

module.exports = {diskUpload , memoryUpload}