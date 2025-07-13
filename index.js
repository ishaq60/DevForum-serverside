const { GoogleGenerativeAI } = require("@google/generative-ai");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config(); // ✅ Load .env FIRST!


const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
  
  const result=await PostCollection.insertOne(postdata)
  res.send(result)
})


let fallbackTo = "openai"; // or other

app.post("/ask-gemini", async (req, res) => {
  const { question } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(question);
    const answer = result.response.text();
    res.send({ answer });
  } catch (err) {
    console.error(err);

    // fallback to OpenAI if rate limited
    if (fallbackTo === "openai") {
      // use OpenAI Node SDK here
      res.send({ answer: "Fallback: Sorry, Gemini is overloaded, please try again later!" });
    } else {
      res.status(500).send({ answer: "All AI services unavailable." });
    }
  }
});


app.get('/posts', async (req, res) => {
  const { q, tag, page,limit } = req.query;


  try {
    const search = q ? { title: { $regex: q, $options: 'i' } } : {};
    const tagFilter = tag && tag !== 'all' ? { tag } : {};

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await PostCollection.countDocuments({ ...search, ...tagFilter });

    // Fetch posts for the current page
    const posts = await PostCollection
      .find({ ...search, ...tagFilter })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.send({ posts, count: totalCount });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});








app.get("/postCount", async (req, res) => {
  const count = await PostCollection.estimatedDocumentCount();
  res.send(count);
});

//total user

app.get("/totaluser",async(req,res)=>{
  const user=await userCollection.estimatedDocumentCount();
 res.send(user)
})


// Express route example


app.get("/announcement", async (req, res) => {
  try {
    const result = await announcementCollection.find().toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

//all user

app.get("/allUsers",async(req,res)=>{
  const result=await userCollection.find().toArray()
  res.send(result)
})




//new user

app.put("/user", async (req, res) => {
  const userdata = req.body;

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

 
  const query={email}
  const result=await userCollection.findOne(query)
  res.send(result)
 
})





app.get('/myPost/:email',async(req,res)=>{
const email=req.params.email

 
 const query = { 'author.email': email };
  const result=await PostCollection.find(query).toArray()
  res.send(result)
 
  
})

app.delete("/deletepost/:id",async(req,res)=>{
  const {id}=req.params

const query={_id:new ObjectId(id)}
 const result = await PostCollection.deleteOne(query);
res.send({result})
})

//Make Admin

app.patch("/makeadmin/:id",async(req,res)=>{
  const {id}=req.params

  const query={_id:new ObjectId(id)}
  const updateDoc = {
    $set: { role: 'admin' }
  };
  const result=await userCollection.updateOne(query,updateDoc)
  res.send({result})
})


//aggerigation finding total post and comment
app.get("/totalspostcomment", async (req, res) => {
  try {
    const result = await PostCollection.aggregate([
      {
        $facet: {
          totalPosts: [
            { $count: "count" }
          ],
          totalComments: [
            { $group: { _id: null, count: { $sum: "$commentsCount" } } }
          ]
        }
      }
    ]).toArray();

    const totalPosts = result[0].totalPosts[0]?.count || 0;
    const totalComments = result[0].totalComments[0]?.count || 0;

    res.send({ totalPosts, totalComments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});



// Route: Create Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body; // amount in cents (e.g., 5000 = $50.00)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
});
//
app.patch('/make-gold-member/:email', async (req, res) => {
  const { email } = req.params;
  console.log('Upgrading subscription status for:', email);

  try {
    const query = { email };
    const updateDoc = {
      $set: { SubscriptionStatus: 'Gold Badge' },
    };

    const result = await userCollection.updateOne(query, updateDoc);

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: 'Subscription upgraded to Gold Badge!' });
    } else {
      res.status(404).send({ success: false, message: 'User not found or already upgraded.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Server error.' });
  }
});




app.listen(port, () => {
  console.log(`dev server is running port:${port}`);
});
