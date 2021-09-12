var express = require('express');
var controller = require('../controller/controller');
var upload = require("../uploadHandler/upload");

var app = express();
var router = express.Router();



router.get("/", controller.home);
router.get("/imagePage", controller.imagesPage);
router.post("/post", upload.single('image'), controller.savePost);
router.get("/signin", controller.signIn);
router.post("/dashboard", controller.dashboard);
router.get("/signup", controller.signup);
router.post("/registerUser", controller.registerUser);
router.post("/userSearch", controller.userSearch);
router.post("/signout", controller.signOut);
router.post("/share", controller.sharePost);
router.post("/dashboardRefresh", controller.dashboardRefresh);


module.exports = router;
