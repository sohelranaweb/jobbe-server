const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASS}@cluster0.5rfjgim.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = (req, res, next) => {
  console.log("log info", req.method, req.url);
  next();
};
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("token in the middleware", token);
  // no token available
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const jobCategoriesCollection = client
      .db("jobList")
      .collection("jobCategories");
    const appliedJobsCollection = client
      .db("jobList")
      .collection("appliedJobs");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out user", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // job categories related api
    app.post("/jobCategories", async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobCategoriesCollection.insertOne(newJob);
      res.send(result);
    });
    app.get("/jobcategories", logger, verifyToken, async (req, res) => {
      const cursor = jobCategoriesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // specific job
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCategoriesCollection.findOne(query);
      res.send(result);
    });

    // update Job get
    app.get("/updateJob/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCategoriesCollection.findOne(query);
      res.send(result);
    });

    // udate job to jobCategories collection
    app.put("/jobCategories/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedJob = req.body;
      const job = {
        $set: {
          user_name: updatedJob.user_name,
          user_email: updatedJob.user_email,
          company_logo: updatedJob.company_logo,
          job_title: updatedJob.job_title,
          job_category: updatedJob.job_category,
          salary_range: updatedJob.salary_range,
          job_description: updatedJob.job_description,
          posting_date: updatedJob.posting_date,
          application_deadline: updatedJob.application_deadline,
          applicants_number: updatedJob.applicants_number,
          job_banner: updatedJob.job_banner,
        },
      };
      const result = await jobCategoriesCollection.updateOne(
        filter,
        job,
        options
      );
      res.send(result);
    });

    // Job Delete
    app.delete("/jobCategories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCategoriesCollection.deleteOne(query);
      res.send(result);
    });

    // applied job related
    app.get("/appliedJobs", logger, verifyToken, async (req, res) => {
      const cursor = appliedJobsCollection.find({ user_email: req.user.email });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/appliedJobs", async (req, res) => {
      const newAppliedJob = req.body;
      console.log(newAppliedJob);
      const result = await appliedJobsCollection.insertOne(newAppliedJob);

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Jobbe server is running");
});

app.listen(port, () => {
  console.log(`Jobbe server is running on: ${port}`);
});
