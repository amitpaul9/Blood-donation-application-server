require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = `${process.env.PORT}` || 3000;

//middlewear
app.use(cors());
app.use(express.json());

// firebase sdk
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const varifyToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().varifyIdToken(idToken);
    console.log("got id token", decoded);
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "got error in authorization" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rbs3vpy.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const bloodDonationApp = client.db("bloodDonationAppCollection");
    const usersCollection = bloodDonationApp.collection("users");
    const donationRequest = bloodDonationApp.collection("requests");

    //user routes
    //post user data
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      try {
        const exitstingUser = await usersCollection.findOne(query);

        if (exitstingUser) {
          return res.send("user already exits");
        }
        const result = usersCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //find user role
    app.get("/users/role/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //donation request routes
    app.post("/requests", varifyToken, (req, res) => {
      try {
        const newRequest = req.body;
        const result = donationRequest.insertOne(newRequest);
        res.send(result);
      } catch (error) {
        return res
          .status(401)
          .send({ message: "got error posting donation request" });
      }
    });

    // get my donation request
    app.get("/requests", varifyToken, async (req, res) => {
      const query = {};
      const email = req.query.requesterEmail;
      if (email) {
        query.email = email;
        console.log("getting email", email);
      }
      const cursor = donationRequest.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Blood Donation Application server running successfully");
});

app.listen(port, () => {
  console.log(`The port is, ${port}`);
});
