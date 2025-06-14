const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");

const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("dev server is running ");
});
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.vu8ej.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

const PostCollection = client.db("DevForum").collection("posts");
const announcementCollection = client.db("DevForum").collection("announce");
const userCollection = client.db("DevForum").collection("users");

// app.get("/posts", async (req, res) => {
//   const result = await PostCollection.find().toArray();
//   res.send(result);
// });

// app.get("/post/:id", async (req, res) => {
//   const id = req.params.id;
//   console.log(id)
//   const query ={_id:new ObjectId(id)};
//   const result = await PostCollection.findOne(query);
//   res.send(result)
//   console.log(result)
// });

app.get("/post/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  const result = await PostCollection.findOne(query);

  res.send(result);
});

app.patch("/comment/:id", async (req, res) => {
  const id = req.params.id;
  const comment = req.body;

  try {
    const result = await PostCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { comments: comment },
        $inc: { commentsCount: 1 },
      }
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

//increment and decrement



app.post('/addpost',async(req,res)=>{
  const postdata=req.body
  console.log(postdata)
  const result=await PostCollection.insertOne(postdata)
  res.send(result)
})






app.get("/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 5;
    const sort = req.query.sort || "newest";

    if (sort === "popular") {
      const posts = await PostCollection.aggregate([
        {
          $addFields: {
            voteDifference: { $subtract: ["$upVotes", "$downVotes"] },
          },
        },
        { $sort: { voteDifference: -1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]).toArray();
      res.send(posts);
    } else {
      const posts = await PostCollection.find({})
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .toArray();
      res.send(posts);
    }
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.get("/postCount", async (req, res) => {
  const count = await PostCollection.estimatedDocumentCount();
  res.send(count);
});

// Express route example
app.get("/posts", async (req, res) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const posts = await PostCollection.find()
    .skip(page * limit)
    .limit(limit)
    .toArray();
  res.send(posts);
});

app.get("/announcement", async (req, res) => {
  try {
    const result = await announcementCollection.find().toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

//new user

app.put("/user", async (req, res) => {
  const userdata = req.body;
console.log(userdata)
  if(!userdata.email) return
  const email = userdata?.email;
  
  const query ={email};
  const isexist = await userCollection.findOne(query);

  if(!isexist){
     const result=await userCollection.insertOne(userdata)
     res.send(result)
  }
});


//user find

app.get('/users/:email',async(req,res)=>{
const email=req.params.email
console.log('dd'  ,email)
 
  const query={email}
  const result=await userCollection.findOne(query)
  res.send(result)
 
})


app.get('/myPost/:email',async(req,res)=>{
const email=req.params.email
console.log('mypost' ,email)
 
 const query = { 'author.email': email };
  const result=await PostCollection.find(query).toArray()
  res.send(result)
  console.log('mygetdata',{result})
  
})

app.delete("/deletepost/:id",async(req,res)=>{
  const {id}=req.params
console.log("deleteid",id)
const query={_id:new ObjectId(id)}
 const result = await PostCollection.deleteOne(query);
res.send({result})
})


app.listen(port, () => {
  console.log(`dev server is running port:${port}`);
});
