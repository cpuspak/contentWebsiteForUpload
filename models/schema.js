const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');


mongoose.connect('mongodb://localhost:27017/content',
    {
        useNewUrlParser:true,
        useCreateIndex:true,
        useFindAndModify:false,
        useUnifiedTopology:true
    }
).then('Connected to DB content').catch(error=>console.log(error));

const models = {}

const users = new mongoose.Schema({
        userId : {
            type : String,
            unique: true
        },
        password : {type : String},
    },
    {
        timestamps : {
            createdAt : true,
            updatedAt : true
        }
    }
);
users.plugin(uniqueValidator)
const posts = new mongoose.Schema(
    {
        postId : {
            type : String,
            unique: true
        },
        userId : {type : String},
        postType : {type : String}
    },
    {
        timestamps : {
            createdAt : true,
            updatedAt : true
        }
    }
)
const imageSchema = new mongoose.Schema({
    postId : String,
    img:
    {
        dataPath: String,
        contentType: String
    }
});

const textSchema = new mongoose.Schema({
    postId : String,
    content : String
    
});

const shares = new mongoose.Schema({
    shareId : String,
    postId : String,
    ownerId : String,
    viewerId : String
});

models.usersModel = mongoose.model('users', users);
models.postsModel = mongoose.model('posts', posts);
models.imageModel = mongoose.model('imageSchema', imageSchema);
models.textModel = mongoose.model('textSchema', textSchema);
models.shareModel = mongoose.model('shares', shares);

module.exports = models;
