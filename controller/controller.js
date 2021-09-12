const models = require('../models/schema');
const bcrypt = require('bcrypt');
const randomString = require('randomstring');
const jwt = require("jsonwebtoken");
const { render } = require('ejs');

const saltRounds = 10;
const tokenSecretText = "SuperSecretText";
const userTokenString = "userToken";
const constPassForUploadRender = randomString.generate();

///////////////////////////////////////////////////////
dashboardLoadMethod = async (userId, password, res) => {
    //var userId = req.body.userName;
    var userObject = await models.usersModel.findOne({userId : userId});
    var validUser = false;
    var passwordMatch = 0;
    if (userObject) passwordMatch = await bcrypt.compareSync(password, userObject.password);
    if (userObject && (passwordMatch || password == constPassForUploadRender)) validUser = true;

    if (!validUser){
        res.render("signin", {auth : "invalid userName/password"});
    }
    else {
        var userPosts = await models.postsModel.find({userId : userId});
        var posts = []
        if (userPosts) {
            for (let i = 0; i < userPosts.length; i++) {
                var item = userPosts[i];
                var postId = item.postId;
                var text = await models.textModel.findOne({postId : postId});
                var image = await models.imageModel.findOne({postId : postId});

                var tempPost = {text : "", imageLocation : ""};
                
                if (text) tempPost.text = text.content;
                if (image) tempPost.imageLocation = image.img.dataPath;

                if (tempPost.text != "" || tempPost.imageLocation != "") {
                    tempPost.shareValidation = null;
                    tempPost.postId = postId;
                    posts.push(tempPost);
                }
                
            }
        }

        var sharedPosts = []
        var sharedUserPosts = await models.shareModel.find({viewerId : userId});
        if (sharedUserPosts){
            for (let index = 0; index < sharedUserPosts.length; index++) {
                var item = sharedUserPosts[index];
                var postId = item.postId;
                var imagePost = await models.imageModel.findOne({postId : postId});
                var textPost = await models.textModel.findOne({postId : postId});
                var tempItem = {};
                if (imagePost) tempItem.imageLocation = imagePost.img.dataPath;
                if (textPost) tempItem.text = textPost.content;
                if (imagePost || textPost) {
                    tempItem.ownerId = item.ownerId;
                    sharedPosts.push(tempItem)
                }
            }
        }


        var renderObject = {
            userName : userId,
            posts : posts,
            sharedPosts : sharedPosts
        }


        
        
        var userIdToken = jwt.sign({data : userId},tokenSecretText, {expiresIn : 1440} );
        res.cookie(userTokenString, userIdToken.toString(), { httpOnly: true });
        renderObject.searchUsers = null;
        renderObject.postValidation = null;
        return renderObject;
        
        
    }
}
///////////////////////////////////////////////////////////////////////////


exports.home = (req, res) => {
    res.render("homepage");
    //res.status(200).send("this is home page");
}
////////////////////////////////////////////////////////////////////////
exports.imagesPage = (req, res) => {
    res.render('upload');
}
//////////////////////////////////////////////////////////////////////////
exports.savePost = async (req, res, next) => {
    try{
        var decoded = jwt.verify(req.cookies.userToken, tokenSecretText);
    } catch(error) {
        res.status(400).send("Invalid token");
    }
    var imageModelErr = false;
    var textModelErr = false;
    var postModelErr = false;
    var userId = decoded.data;
    var postId = randomString.generate();
    if (!req.file && (!req.body.text || req.body.text.trim() == "")){
        var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
        renderObject.postValidation = "cannot do empty post";
        res.render("dashboard", renderObject);
    }
    else if (req.body.text && req.body.text.trim().split(" ").length > 1000){
        var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
        renderObject.postValidation = "max limit 1000 words";
        res.render("dashboard", renderObject);
    } 
    else {
        if (req.file){
            var imgObj = {
                postId: postId,
                img: {
                    dataPath: '/uploads/' + req.file.filename,
                    contentType: 'image/png'
                }
            }
            try{
                await models.imageModel.create(imgObj);
            } catch(err) {
                console.log(err);
                imageModelErr = true;
            }
        }

        if (req.body.text) {
            var textObj = {
                postId : postId,
                content : req.body.text
            }
            try{
                await models.textModel.create(textObj);
            } catch(err) {
                console.log(err);
                textModelErr = true;
            }
        }

        if (!imageModelErr && !textModelErr){
            var postObj = {
                postId : postId,
                userId : userId
            }
            try{
                await models.postsModel.create(postObj);
            } catch(err) {
                console.log(err);
                postModelErr = true;
            }
                
        } else {
            res.status(500).send("internal server err2");
        }
        
        if (!imageModelErr && !textModelErr && !postModelErr) {
            var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
            res.render("dashboard", renderObject);
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////
exports.signIn = async(req, res) => {

    var decoded;

    try{
        decoded = jwt.verify(req.cookies.userToken, tokenSecretText);
        var userId = decoded.data;
        var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
        res.render("dashboard", renderObject);
    } catch(error) {
        res.render("signin", {auth : 0});
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////
exports.dashboard = async (req, res) => {
    var renderObject = await dashboardLoadMethod(req.body.userName, req.body.password, res);
    res.render("dashboard", renderObject);
}
//////////////////////////////////////////////////////////////////////////////////////
exports.dashboardRefresh = async (req, res) => {
    try{
        decoded = jwt.verify(req.cookies.userToken, tokenSecretText);
        var userId = decoded.data;
        var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
        res.render("dashboard", renderObject);
    } catch(error) {
        res.render("signin", {auth : "session time out"});
    }
}

//////////////////////////////////////////////////////////////////////////////////////
exports.registerUser = async (req, res) => {
    var userName = req.body.userName;
    var password = req.body.password;
    const salt = bcrypt.genSaltSync(saltRounds);
    var hashedPassword = await bcrypt.hashSync(req.body.password, salt);
    var userObj = {
        userId : userName,
        password : hashedPassword
    };
    models.usersModel.create(userObj, (error, item) => {
        if (error) {
            res.render("signup", {error : "duplicate user name", success : 0});
        } else {
            res.render("signup", {error : 0, success : "Created user with UserName "+userName});
        }
    });
}
////////////////////////////////////////////////////////////////////////////////////////

exports.userSearch = async (req, res) => {
    var searchString = ".*"+req.body.searchString+".*";
    var decoded;

    try{
        decoded = jwt.verify(req.cookies.userToken, tokenSecretText);
    } catch(error) {
        res.status(400).send("Invalid token");
    }
    var userId = decoded.data;
    var searchUsers = [];
    try{
    searchUsers = await models.usersModel.find({userId: { $regex: searchString } });
        //searchUsers = await models.usersModel.find({userId : "puspak"});
    } catch (err) {
        res.status(500).send("internal server err");
    }
    

    
    var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
    if (searchUsers.length > 0) {
        var tempSearchUsers = [];
        searchUsers.forEach((items) => {
            tempSearchUsers.push(items.userId)
        })
        renderObject.searchUsers = tempSearchUsers;
    }
    else renderObject.searchUsers = "no user found";
    res.render("dashboard", renderObject);

    
}

/////////////////////////////////////////////////////////////////////////
exports.sharePost = async (req, res) => {

    var decoded;

    try{
        decoded = jwt.verify(req.cookies.userToken, tokenSecretText);
    } catch(error) {
        res.status(400).send("Invalid token");
    }
    var userId = decoded.data;

    var postId = req.body.sharePostId;
    var shareWithUser = req.body.shareWithUserId;

    try {


        shareWithUser = await models.usersModel.findOne({userId : shareWithUser});
        if (shareWithUser && shareWithUser.userId == userId){
            var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
            for (let index = 0; index < renderObject.posts.length; index++) {
                if (renderObject.posts[index].postId == postId){
                    renderObject.posts[index].shareValidation = "cannot share with yourself";
                    break;
                }
            }
            res.render("dashboard", renderObject);
        }
        else if (!shareWithUser) {
            var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
            for (let index = 0; index < renderObject.posts.length; index++) {
                if (renderObject.posts[index].postId == postId){
                    renderObject.posts[index].shareValidation = "invalid user name";
                    break;
                }
            }
            res.render("dashboard", renderObject);
        } else {
            var alreadyShared = await models.shareModel.findOne({
                postId : postId,
                ownerId : userId,
                viewerId : shareWithUser.userId
            });
            if (alreadyShared) {
                var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
                for (let index = 0; index < renderObject.posts.length; index++) {
                    if (renderObject.posts[index].postId == postId){
                        renderObject.posts[index].shareValidation = "already shared with " + shareWithUser.userId;
                        break;
                    }
                }
                res.render("dashboard", renderObject);
            }
            else {
                var shareId = randomString.generate();
                var shareObj = {
                    shareId : shareId,
                    postId : postId,
                    ownerId : userId,
                    viewerId : shareWithUser.userId
                }

                await models.shareModel.create(shareObj);
                
                var renderObject = await dashboardLoadMethod(userId, constPassForUploadRender, res);
                for (let index = 0; index < renderObject.posts.length; index++) {
                    if (renderObject.posts[index].postId == postId){
                        renderObject.posts[index].shareValidation = "shared with " + shareWithUser.userId;
                        break;
                    }
                }
                res.render("dashboard", renderObject);
            }
            
        }
    } catch (error) {
        res.status(500).send("internal server error");
    }

    

    


}


/////////////////////////////////////////////////////////////////////////

exports.signup = (req, res) => {
    res.render("signup", {error : 0, success : 0});
}
////////////////////////////////////////////////////////////////////////
exports.signOut = (req, res) => {
    res.clearCookie(userTokenString);
    res.redirect("/");
}