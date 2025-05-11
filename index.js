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

//Get all post data

app.get("/posts", async (req, res) => {
  const result = await PostCollection.find().toArray();
  res.send(result);
});

// app.get("/post/:id", async (req, res) => {
//   const id = req.params.id;
//   console.log(id)
//   const query ={_id:new ObjectId(id)};
//   const result = await PostCollection.findOne(query);
//   res.send(result)
//   console.log(result)
// });

app.get('/post/:id',async(req,res)=>{
    const id=req.params.id
    console.log(id)
    const query={_id:new ObjectId(id)}
    const result=await PostCollection.findOne(query)
   
    res.send(result)
})

app.patch('/comment/:id', async (req, res) => {
  const id = req.params.id;
  const comment = req.body;

  try {
    const result = await PostCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { comments: comment },
        $inc: { commentsCount: 1 }
      }
    );
res.send(result)
    
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).send({ success: false, error: 'Internal Server Error' });
  }
});


//increment and decrement 

app.post('/votecount/:id', async (req, res) => {
  const id = req.params.id;  // Extract post ID from the URL parameter
  const { vote } = req.body; // Destructure the vote ('up' or 'down') from the request body
  
  // Log the received data (useful for debugging)
  console.log('id and vote', id, vote);

  // MongoDB query to find the post by ID
  const query = { _id: new ObjectId(id) };

  // Conditional logic for vote increment/decrement
  const updateDoc =
    vote === 'up'
      ? { $inc: { upVotes: 1, downVotes: -1 } }  // Increment upVotes and decrement downVotes
      : { $inc: { downVotes: 1, upVotes: -1 } }; // Increment downVotes and decrement upVotes

  try {
    // Update the post document in the database
    const result = await PostCollection.updateOne(query, updateDoc);
    
    // Send the result of the update operation back to the client
    res.send(result);
  } catch (error) {
    console.error('Error updating votes:', error);
    res.status(500).send({ success: false, error: 'Internal Server Error' });
  }
});







app.listen(port, () => {
  console.log(`dev server is running port:${port}`);
});
