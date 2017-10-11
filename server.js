var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var app = express();
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

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

app.get("/api/session", function(req, res) {
  db.collection("sessions").findOne({ token: req.query.token }, function(err, doc) {
    if (err || !doc) {
      handleError(res, err.message, "Failed to get session.");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.post("/api/session", function(req, res) {
  db.collection("sessions").replaceOne({ token: req.body.token }, {
    token: req.body.token, //not a real token in the secure sense, we don't really care about data because this is a demo
    balanceA: 100,
    balanceB: 0
  },{ upsert: true }, function(err, doc) {
    if (err || !doc) {
      handleError(res, err.message, "Failed to create new session.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.post("/api/send", function(req, res) {
  db.collection("sessions").findOne({ token: req.body.token }, function(err, session) {
    if (err || !session) {
      handleError(res, err.message, "Failed to get session.");
    } else {
      setTimeout(function() { // add an artificial pause of 1 second to make easier to reproduce
        var shouldProceed = false;
        if (req.body.sending && req.body.amount > 0 && req.body.amount <= session.balanceA) {
          shouldProceed = true;
        }
        if (!req.body.sending && req.body.amount > 0 && req.body.amount <= session.balanceB) {
          shouldProceed = true;
        }
        if (shouldProceed) {
          db.collection("sessions").findOne({ token: req.body.token }, function(err, updatedSession) {
            if (err || !updatedSession) {
              handleError(res, err.message, "Failed to get session.");
            } else {
              var updatedObject = {
                _id: session._id,
                balanceA: updatedSession.balanceA + (req.body.sending ? -1*req.body.amount : req.body.amount),
                balanceB: updatedSession.balanceB + (req.body.sending ? req.body.amount : -1*req.body.amount), 
                token: session.token};
              db.collection("sessions").save(updatedObject, function(err, doc) {
                if (err) {
                  handleError(res, err.message, "Failed to save session.");
                } else {
                  res.status(200).json(updatedObject);
                }
              });
            }
          });
        } else {
          res.status(400).json({"error":"Not enough money / invalid amount!"});
        }
      }, 1000);
    }
  });
})
