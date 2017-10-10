var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var app = express();
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*  "/api/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */

app.get("/api/balance", function(req, res) {
  db.collection("sessions").findOne({ token: req.body.token }).(function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get session.");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.post("/api/createSession", function(req, res) {

  db.collection("sessions").insertOne({
    token: req.body.token, //not a real token in the secure sense, we don't really care about data because this is a demo
    balanceA: 100,
    balanceB: 0
  }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new session.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});
