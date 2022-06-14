const express        = require('express'),
	  bodyParser       = require("body-parser"),
    methdOverride    = require("method-override"),
	  mongoose         = require("mongoose"),
    expressSanitizer = require("express-sanitizer"),
    passport         = require('passport'),
    User             = require("./models/user"),
    LocalStrategy    = require('passport-local'),
    passportMongoose = require('passport-local-mongoose'),
    striptags        = require('striptags'),
    moment           = require('moment-timezone'),
    flash            = require('connect-flash'),
	  app              = express();

app.set("view engine" , "ejs");
app.use(express.static('assets'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(expressSanitizer());
app.use(methdOverride("_method"));
app.use(flash());


//Data Model - mongodb atlas connection
mongoose.connect(
  `mongodb+srv://Junayed:Junayedcr7@cluster0.pouji.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, 
  {
    useNewUrlParser: true,
    useFindAndModify: false
  }
);
// mongoose.connect("mongodb://localhost:27017/Transaction_Data", { useNewUrlParser: true });
const transactionSchema = new mongoose.Schema({
	amount: Number,
    name: String,
    description: String,
    action:String,
    username:String,
    dateCreated:String,
    timeCreated:String,
    created: { type: Date, default: Date.now() }
});
const transactions = mongoose.model("transactions", transactionSchema);

//Passport Configuration
app.use(require("express-session")({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//currenUser middleware
app.use((req, res, next) =>{
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.primary = req.flash("primary");
  next();
});


//--------Routes-crud-start------------
app.get("/", (req, res) => {
	res.render("home");
});
app.get("/add",isLoggedIn, (req, res) => {
	res.render("add", {moment: moment});
});

app.get("/transaction",isLoggedIn, (req, res) =>{

  var userOne = req.user.username;
	transactions.find({username:userOne}, (err,transactionData) =>{
    if(err){
        res.redirect('back');
    }
    else{
    transactions.find({username:userOne, action:"+"}, function(err , credit){
       if(err){
           res.redirect('back');
       }
       else{
       	   transactions.find({username:userOne, action:"-"}, function(err , debit){
       	   	if(err){
       	   		res.redirect('back');
       	   	}
       	   	else{
            res.render("transaction" , {transactions:transactionData,credits:credit,debits:debit});
           }
       }); 
    }
 });
}})});
// creating transaction
app.post("/addTransaction",isLoggedIn, (req, res) =>{
  req.body.new.amount = req.sanitize(req.body.new.amount);
  req.body.new.name = req.sanitize(req.body.new.name);
  req.body.new.description = req.sanitize(req.body.new.description);

	transactions.create(req.body.new , function(err,newbie){
        if(err){
            res.redirect('back')
        }
        else{
            req.flash("primary", "Added new transaction");
            res.redirect("/transaction");
        }
    });
});
//update transaction
app.get("/transaction/:id/edit",isLoggedIn, (req , res)=>{
 transactions.findOne({_id:req.params.id} , (err , foundOne)=>{
    if(err){
        res.redirect("/");
    } 
    else{
        res.render("edit" , {foundOne:foundOne});
    }
 });
});

app.put("/transaction/:id",isLoggedIn, (req , res)=>{

  req.body.newOne.name = req.sanitize(req.body.newOne.name);
  req.body.newOne.description = req.sanitize(req.body.newOne.description);

    transactions.findOneAndUpdate({_id:req.params.id} , req.body.newOne , function(err , updatedOne){
       if(err){
          res.redirect("/");
       }else{
          req.flash("primary", "Updated successfully");
          res.redirect("/transaction");
        }   
    });
});
//Delete transaction
app.delete("/transaction/:id/delete",isLoggedIn, function(req , res){
transactions.findOneAndDelete({_id:req.params.id} , function(err){
    if(err){
       res.redirect("/");  
    }else{
        req.flash("primary", "Deleted successfully")
        res.redirect("/transaction");
    }
});     
});
//------crud end--------------

//------ Auth Routes ---------

//show register form
app.get("/register", (req, res) =>{
  var message = '';
  res.render("register", {msg:message})
});
//handle sign up logic
app.post("/register", function(req, res){
  User.register(new User({username:req.body.username}) , req.body.password ,function(err , user){
    if(err){
        var message = err.message;
        return res.render("register", {msg:message});
    }
   passport.authenticate('local')(req , res, function(){
       req.flash("success", "Welcome to DailyPay " + user.username);
       res.redirect("/transaction");
   });
});
});
//show login form
app.get("/login", (req, res) =>{
  res.render("login");
});
//handle login logic
app.post("/login", passport.authenticate('local',{
    successRedirect:"/transaction",
    failureRedirect:"/login"
    
}),(req , res) =>{   
});
//handle logout
app.get("/logout" , function(req , res){
    req.logout();
    req.flash("success", "You are successfully logged out!");
    res.redirect("/");
});
//isLoggedIn middleware
function isLoggedIn(req , res , next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please login first!");
    res.redirect("/login");
}

//catch all route

app.get("*", (req, res) => {
	res.render("404message");
});
const port = process.env.PORT;
app.listen(port , process.env.IP , () =>{
});