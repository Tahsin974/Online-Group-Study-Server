const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()



const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(express.json());
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3lwmdbh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      await client.connect();

      const assignmentsCollection = client.db("online_study_db").collection("assignments");

      app.get('/assignments', async(req,res)=>{
        
        const options = {
            // Sort returned documents in ascending order by title (A->Z)
            sort: { title: 1 },
            
          };
        const cursor = assignmentsCollection.find({},options);

        const result = await cursor.toArray()
        res.json(result)

      })

      
    } finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


app.get("/", (req,res) =>{
    res.send("welcome to online study server")
})

app.listen(port,()=>{
    console.log("listening to the port:",port)
})
