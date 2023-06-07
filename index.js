const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()

const cors = require('cors')
// middleware
app.use(cors());
app.use(express.json());





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ow3zltf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const instructorsCollection = client.db('summerCampDB').collection('instructors');
        const usersCollection = client.db('summerCampDB').collection('users');

        // instructors
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })


        // users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        //   admin

        app.get('/users/admin/:email',async(req,res)=>{
            const email=req.params.email;
            const query={email:email};
            const user=await usersCollection.findOne(query);
            const result={admin:user?.role==='admin'}
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDocument = {
                $set: {
                    role:'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDocument);
            res.send(result);

        })


        // instructor
        
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDocument = {
                $set: {
                    role:'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDocument);
            res.send(result);

        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('assignment--12 server site running');
})

app.listen(port, () => {
    console.log(`server running on port ${port}`);
})