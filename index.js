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
        premium: false,
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

    // get all users data from usersCollection(admin only)
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

    // get specific users data from usersCollection(logged only)
    app.get("/user/:email", verifyToken, async (req, res) => {
      const { email } = req?.params;

      // data provide only valided user verify with token and email start here
      if (req?.decoded?.email !== email) {
        return res.status(403).send("Forbidden");
      }
      // data provide only valided user verify with token  adn email end here

      const query = { email: email };
      const options = {
        projection: { _id: 0, role: 1, premium: 1 },
      };
      const result = await usersCollection.findOne(query, options);
      res.send(result);
    });

    // user count in usersCollection
    app.get("/user-statistics", async (req, res) => {
      // all user count
      const allUser = await usersCollection.countDocuments();

      // normal user count
      const normalUser = await usersCollection.countDocuments({
        premium: false,
      });

      // premium  user count
      const premiumUser = await usersCollection.countDocuments({
        premium: true,
      });

      res.send({ allUser, normalUser, premiumUser });
    });

    // user api end here

    // articles api start here

    // insert a new article in articlesCollection
    app.post("/articles", async (req, res) => {
      const data = req.body;

      const newArticle = {
        ...data,
        status: "pending",
        time: Date.now(),
        viewCount: 0,
      };

      const result = await articlesCollection.insertOne(newArticle);
      res.send(result);
    });

    // get all articles data from articlesCollection (admin only)
    app.get("/articles", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = articlesCollection.find({}, { sort: { status: -1 } });
      const result = await cursor.toArray();
      res.send(result);
    });

    // single article make premium in articlesCollection by article id (admin only)
    app.put("/articles/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatePremium = {
        $set: {
          isPremium: true,
        },
      };
      const result = await articlesCollection.updateOne(filter, updatePremium);
      res.send(result);
    });

    // single article update for status decline in articlesCollection by article id (admin only)
    app.put(
      "/article-decline/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const { declineReason } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDeclined = {
          $set: {
            status: "declined",
            declinedText: declineReason,
          },
        };
        const result = await articlesCollection.updateOne(
          filter,
          updateDeclined
        );
        res.send(result);
      }
    );

    // single article update for status approved in articlesCollection by article id (admin only)
    app.patch("/articles/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: "approved",
        },
      };
      const result = await articlesCollection.updateOne(filter, updateStatus);
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

    // single article view count increment in articlesCollection
    app.put("/article-count/:id", async (req, res) => {
      const countData = req.body;
      const { id } = req.params;

      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { _id: 0, viewCount: 1 },
      };
      const latestCountData = await articlesCollection.findOne(query, options);

      const filter = { _id: new ObjectId(id) };
      const updateCount = {
        $set: {
          viewCount: countData?.count + latestCountData?.viewCount,
        },
      };

      const result = await articlesCollection.updateOne(filter, updateCount);

      res.send(result);
    });

    // get all trending(most views) articles from articlesCollection
    app.get("/trending-articles", async (req, res) => {
      const query = {
        viewCount: { $gt: 0 },
      };
      const options = {
        sort: { viewCount: -1 },
        projection: { image: 1, title: 1, time: 1, isPremium: 1 },
      };
      const cursor = articlesCollection.find(query, options).limit(6);
      const result = await cursor.toArray();

      res.send(result);
    });

    // get all premium articles data from articlesCollection (premium only)
    app.get("/premium-articles", verifyToken, async (req, res) => {
      const email = req?.headers?.email;

      // verify the current user is premium start here
      const { premium } = await usersCollection.findOne(
        { email: email },
        { projection: { _id: 0, premium: 1 } }
      );
      if (!premium) return res.status(401).send({ message: "Forbidden" });
      // verify the current user is premium end here

      const query = { isPremium: true };
      const options = {
        projection: { image: 1, title: 1, publisher: 1, description: 1 },
      };

      const cursor = articlesCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all articles data of current user from articlesCollection
    app.get("/my-articles", verifyToken, async (req, res) => {
      const requestUserEmail = req?.headers?.email;
      const currentLoginUserEamil = req?.decoded?.email;

      // verify the current user start here

      if (currentLoginUserEamil !== requestUserEmail)
        return res.status(401).send({ message: "Forbidden" });
      // verify the current user end here

      const query = { "author.email": requestUserEmail };

      const options = {
        sort: { status: -1 },
        projection: { title: 1, status: 1, isPremium: 1, declinedText: 1 },
      };

      const cursor = articlesCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // update a single article of current user from articlesCollection
    app.patch("/my-articles/:id", verifyToken, async (req, res) => {
      const updateData = req.body;
      const { id } = req.params;

      const filter = { _id: new ObjectId(id) };
      const updateArticle = {
        $set: {
          ...updateData,
        },
      };
      const result = await articlesCollection.updateOne(filter, updateArticle);
      res.send(result);
    });

    // single my article delele from articlesCollection by article id
    app.delete("/my-articles/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
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
