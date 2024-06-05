const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
var cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");

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

// my middleware start here

// token validaton of logged user
const verifyToken = (req, res, next) => {
  const token = req.headers;

  if (!token?.authorization) {
    return res.status(401).send("Unauthorized");
  }

  const pureToken = token?.authorization?.split(" ")[1];

  jwt.verify(pureToken, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.decoded = decoded;
    next();
  });
};
// my middleware end here

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

    // collection two
    const publishersCollection = database.collection("publishers");

    // collection three
    const usersCollection = database.collection("users");

    // my middleware start here

    // checking user is admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;

      const query = {
        email: email,
      };
      const options = {
        projection: { _id: 0, role: 1 },
      };
      const user = await usersCollection.findOne(query, options);

      if (user?.role === "Admin") {
        next();
      } else {
        return res.status(403).send({ message: "Forbidden" });
      }
    };

    // my middleware end here

    // security api start here

    // when user login success active this api for security purpose
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // security api end here

    // user api start here

    // new user data save to usersCollection
    app.post("/users", async (req, res) => {
      const userData = req.body;

      const userSaveData = {
        ...userData,
        role: "User",
        Premium: false,
        time: Date.now(),
      };

      //  is user already available in usersCollection checking
      const query = { email: userData?.email };
      const isAvailable = await usersCollection.findOne(query);
      if (isAvailable) {
        return res.send({
          message: "The user is already available in db",
        });
      }

      // when user is null in usersCollection then insert user data
      const result = await usersCollection.insertOne(userSaveData);
      res.send(result);
    });

    // get all users data for admin from usersCollection
    app.get("/users-admin", verifyToken, verifyAdmin, async (req, res) => {
      const query = {};
      const options = {
        projection: { email: 1, name: 1, image: 1, role: 1 },
      };
      const cursor = usersCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // user role status update in usersCollection (admin only)
    app.patch(
      "/users-admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const updateRole = {
          $set: {
            role: "Admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updateRole);
        res.send(result);
      }
    );

    // user api end here

    // articles api start here

    // insert a new article in articlesCollection
    app.post("/articles", async (req, res) => {
      const data = req.body;

      const newArticle = {
        ...data,
        status: "pending",
        time: Date.now(),
      };

      const result = await articlesCollection.insertOne(newArticle);
      res.send(result);
    });

    // get all articles data from articlesCollection (admin only)
    app.get("/articles", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = articlesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // single article delele from articlesCollection by article id (admin only)
    app.delete("/articles/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
      res.send(result);
    });

    // get all approved articles from articlesCollection
    app.get("/approved-articles", async (req, res) => {
      const query = { status: "approved" };
      const cursor = articlesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get single article from articlesCollection by id
    app.get("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    });

    // publisher api start here

    // insert a new publishers in publishersCollection
    app.post("/publishers", async (req, res) => {
      const data = req.body;
      const result = await publishersCollection.insertOne(data);
      res.send(result);
    });

    // get all publishers from publishersCollection
    app.get("/publishers", async (req, res) => {
      const query = {};
      const options = {
        projection: { _id: 0, name: 1, image: 1 },
      };
      const cursor = publishersCollection.find(query, options);
      const result = await cursor.toArray();
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
