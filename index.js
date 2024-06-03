const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
var cors = require("cors");
require("dotenv").config();

// create express app
const app = express();

// port
const port = process.env.PORT || 5003;

// express middleware start here
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://b9a12-client-side-44fahadhasan.netlify.app",
    ],
    credentials: true,
  })
);
// express middleware end here

// mongodb database code start here
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@clustercar.wslyx5y.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCar`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // database
    const database = client.db("discussion");

    // collection one
    const articlesCollection = database.collection("articles");

    // insert a new article in articlesCollection
    app.post("/articles", async (req, res) => {
      const data = req.body;

      const article = {
        ...data,
        status: "pending",
        time: Date.now(),
      };

      const result = await articlesCollection.insertOne(article);
      res.send(result);
    });

    // clear code last time start here
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    // clear code last time end  here
  } finally {
    // code
  }
}
run().catch(console.log);
// mongodb database code end here

//  server root path
app.get("/", (req, res) => {
  res.send("Discussion server start now.");
});

app.listen(port, () => {
  console.log(`server running on the port: ${port}`);
});
