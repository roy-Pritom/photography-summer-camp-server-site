const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');

const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


const cors = require('cors')
// middleware
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




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
        // await client.connect();

        const instructorsCollection = client.db('summerCampDB').collection('instructors');
        const usersCollection = client.db('summerCampDB').collection('users');
        const classCollection = client.db('summerCampDB').collection('classes');
        const cartCollection = client.db('summerCampDB').collection('cart');
        const paymentCollection = client.db("summerCampDB").collection("payments");


        // jwt
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token });
        })


        //   classes
        app.get('/classes/:all', async (req, res) => {
            const all = req.params.all;
            if (all === 'true') {
                const result = await classCollection.find().toArray();
                res.send(result);
            }
            else {

                const query = { status: 'approved' }
                const result = await classCollection.find(query).sort({ totalEnrolledStudents: -1 }).toArray();
                res.send(result);
            }
        })


        app.get('/classes', async (req, res) => {
            const email = req.query.email;
            const query = { instructorEmail: email }
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })



        app.post('/classes', async (req, res) => {
            const myClass = req.body;
            const result = await classCollection.insertOne(myClass);
            res.send(result);
        })

        app.patch('/classes/:id', async (req, res) => {
            const data = req.body;
            const { approve } = data;

            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };


            if (approve === true) {
                const updateDocument = {

                    $set: {
                        status: approve === true ? 'approved' : 'denied'

                    }


                }

                const result = await classCollection.updateOne(filter, updateDocument);
                res.send(result);
            }
            if (approve === false) {
                const updateDocument = {

                    $set: {
                        status: approve === false ? 'denied' : 'approved'

                    }

                }


                const result = await classCollection.updateOne(filter, updateDocument);
                res.send(result);
            }

            if (approve === '1') {
                const updateDocument = {

                    $set: {
                        classImg: data.photo,
                        className: data.name,
                        price: data.price

                    }

                }


                const result = await classCollection.updateOne(filter, updateDocument);
                res.send(result);
            }


        })

        app.put('/classes/:id', async (req, res) => {
            const data = req.body;
            // console.log(data);
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    adminFeedback: data?.adminFeedback
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
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

        app.put('/users/:id', async (req, res) => {
            const data = req.body;
            // console.log(data);
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    adminFeedback: data.adminFeedback
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })




        //  cart
        app.post('/carts', async (req, res) => {
            const data = req.body;
            const result = await cartCollection.insertOne(data);
            res.send(result);
        })
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            if (req.decoded.email !== email) {
                return res.status(403).send({ error: true, message: 'forbidden access' })

            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.findOne(query);
            res.send(result);
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

        //   admin

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDocument = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDocument);
            res.send(result);

        })


        // instructor(admin make instructor)

        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result);
        })

        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDocument = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDocument);
            res.send(result);

        })


        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        // payment related api
        app.post('/payments', verifyJWT, async (req, res) => {

            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: new ObjectId(payment.cartItems._id) };
            const deleteResult = await cartCollection.deleteOne(query)


            const seats = payment.seats - 1;
            const enrolled = parseInt(payment.enrolledStudents)
            const enrolledStudents = enrolled + 1;

            const filter = { _id: new ObjectId(payment.classId) }
            console.log(payment.classId);
            const doc = {
                $set: {
                    seats: seats,
                    totalEnrolledStudents: enrolledStudents
                },
            }

            const updateResult = await classCollection.updateOne(filter, doc)

            res.send({ insertResult, deleteResult, updateResult });
        })

        app.get('/payments/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).sort({ $natural: -1 }).toArray();
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
    res.send('assignment-12 server site running');
})

app.listen(port, () => {
    console.log(`server running on port ${port}`);
})