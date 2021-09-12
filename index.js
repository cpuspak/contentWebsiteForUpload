var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var router = require('../contentWebSite/routes/router');




const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use('/',router);

app.set("view engine", "ejs");

app.listen(3000, () => console.log("server started at 3000"));