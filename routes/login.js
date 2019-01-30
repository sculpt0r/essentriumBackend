var express = require('express');
var router = express.Router();
var sessionCfg = require('../local_modules/session.js')
/* GET users listing. */

router.get('/', function (req, res, next) {
    var sess = req.session


    console.log("ciastka: " + JSON.stringify(req.cookies))
    console.log("req.sess" + JSON.stringify(sess))

    //session verification must be in separate module and chek on every stricted request!
    //if check fail -> response 404 or sth?

    //został zainicjalizowany
    if (sess.email) {
        //TUTAJ MOGE PRZEPUSCIC REQUESTA, bo jest gracz zalogowany
    } else {
        //user doesn't have registered session
        //need to send here login and pass 
        //base on those -> verify with db
        //set session params (like real email or sth)
        //from this point any restricted pages should be accesible for user
        sess.email = 'test@sess.com'; // get from MONGO

    }

    //sztywne tworzenie ciastka
    // console.log(req.session);
    // if(req.cookies.cookieName === undefined)
    // {
    //   res.cookie('cookieName', 'myName', {maxAge: 9000, httpOnly: true});
    //   console.log('cookie just created');
    // }
    // else {
    //   console.log('cookie', req.cookies.cookieName);
    // }
    //  console.log("session: " + req.cookies.cookieName);
    // res.cookie({ name: 'key cat' })
    // res.send()
    res
        .status(200)
        .json({
             mail: sess.email
            })
        .end()
});

module.exports = router;
