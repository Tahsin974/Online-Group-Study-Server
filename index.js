const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tahsin-online-study.web.app",
    "https://tahsin-online-study.firebaseapp.com"],
    credentials: true,
  })
);
app.use(cookieParser());

// Custom Middleware
const verifyToken = (req, res, next) => {
  const Token = req.cookies.token;
  
  if (!Token) {
    res.status(401).send({ message: "Unauthorized Access" });
  } 
  else {
    jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        console.log(err)
        res.status(401).send({ message: "Unauthorized Access" });

      } else {
        req.user = decoded;
        next();
      }
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3lwmdbh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // await client.connect();

    const assignmentsCollection = client
      .db("online_study_db")
      .collection("assignments");
    const attemptAssignmentsCollection = client
      .db("online_study_db")
      .collection("attempt-assignments");

    const featuresCollection = client
      .db("online_study_db")
      .collection("features");

    // Auth Related APIs
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const Token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res
        .cookie("token", Token, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        })
        .send(Token);
    });
    app.post('/logOut', async (req, res) => {
      
     
      res.clearCookie('token',{maxAge:0})
        .send({message:'success'});
    });

    // Assignments Related APIs
    // Get Related APIs
    // get assignments from db
    app.get("/assignments",verifyToken, async (req, res) => {
      const options = {
        // Sort returned documents in ascending order by title (A->Z)
        sort: { title: 1 },
      };
      const cursor = assignmentsCollection.find({}, options);

      const result = await cursor.toArray();
      res.json(result);
    });
    // Get Assignment By Id
    app.get("/assignment",verifyToken, async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const assignment = await assignmentsCollection.findOne(query);
      res.json(assignment);
    });
    // Get Assignment Details
    app.get("/assignment-details/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const assignment = await assignmentsCollection.findOne(query);
      res.json(assignment);
    });

    // get pending assignments from db
    app.get("/pending-assignments",verifyToken, async (req, res) => {
      const status = req.query.status;
      const email = req.query.email;
      if (req.user.email == email) {
        const query = { status, email };
        const cursor = attemptAssignmentsCollection.find(query);

        const result = await cursor.toArray();
        res.json(result);
      }
      else {
        res.status(403).send({message:'Forbidden Access'})
      }
    });
    // get attempted assignments from db
    app.get("/attempted-assignments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { examineeEmail: email };
      const cursor = attemptAssignmentsCollection.find(query);
      
      if (req.user.email == email) {
        const result = await cursor.toArray();
        res.json(result);
      } else {
        res.status(403).send({message:'Forbidden Access'})
      }
    });
    // get features from db
    app.get("/features",verifyToken, async (req, res) => {
      const options = {
        // Sort returned documents in ascending order by title (A->Z)
        sort: { name: 1 },
      };
      const cursor = featuresCollection.find({}, options);

      const result = await cursor.toArray();
      res.json(result);
    });

    // Post Related APIs
    // post new assignment in db
    app.post("/new-assignment",verifyToken, async (req, res) => {
      
      const docs = req.body;
      const result = await assignmentsCollection.insertOne(docs);

      res.json(result);
    });
    // post submitted assignments in db
    app.post("/attempt-assignments", async (req, res) => {
      const docs = req.body;
      console.log(docs);
      const result = await attemptAssignmentsCollection.insertOne(docs);

      res.json(result);
    });

    // Update Related APIs
    // update assignment from client site
    app.put("/update-assignment", async (req, res) => {
      const id = req.query.id;
      const filter = { _id: new ObjectId(id) };
      const assignment = req.body;
      const updatedDoc = {
        $set: {
          title: assignment.title,
          thumbnailImageURL: assignment.thumbnailImageURL,
          marks: assignment.marks,
          difficultyLevel: assignment.difficultyLevel,
          date: assignment.date,
          description: assignment.description,
        },
      };

      console.log(id);
      console.log(updatedDoc);
      const result = await assignmentsCollection.updateOne(filter, updatedDoc);
      console.log(result);
      res.send(result);
    });
    // update pending assignments from client site
    app.put("/update-pending-assignment", async (req, res) => {
      const id = req.query.id;
      const filter = { _id: new ObjectId(id) };
      const updatePendingAssignment = req.body;
      const updatedDoc = {
        $set: {
          feedback: updatePendingAssignment.feedback,
          obtainedMarks: updatePendingAssignment.obtainedMarks,
          status: updatePendingAssignment.status,
        },
      };

      const result = await attemptAssignmentsCollection.updateOne(
        filter,
        updatedDoc
      );
      console.log(result);
      res.send(result);
    });

    // Delete Related APIs
    // delete assignment from db
    app.delete("/delete-assignment", async (req, res) => {
      const email = req.query.email;
      const id = req.query.id;
      const userEmail = req.query.userEmail;
      const query = { _id: new ObjectId(id) };
      console.log(userEmail, email, id);

      if (userEmail == email) {
        const result = await assignmentsCollection.deleteOne(query);
        res.send(result);
      } else {
        res.send({ result: "unsuccessfull" });
      }
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("welcome to online study server");
});

app.listen(port, () => {
  console.log("listening to the port:", port);
});
