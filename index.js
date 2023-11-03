const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_USER)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mypgnvz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// manual middleware
const verifyToken = async(req,res,next)=>{
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({message:'not authorized'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
            return res.status(401).send({message:'not authorized'})
        }
        console.log('value in the toen', decoded);
        req.user=decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const servicecollection = client.db('Car_Doctor').collection('services');
        const bookingcollection = client.db('Car_Doctor').collection('bookings');

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                // sameSite: 'none'
            })
                .send({ success: true });
        })
        // services related api
        app.get('/services', async (req, res) => {
            const cursor = servicecollection.find();
            const result = await cursor.toArray();
            res.send(result);

        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { price: 1, service_id: 1, img: 1, email: 1 },
            };
            const query = { _id: new ObjectId(id) }
            const result = await servicecollection.findOne(query, options);
            res.send(result);
        })

        // bookings

        app.get('/bookings', verifyToken, async (req, res) => {

            //console.log('tok tok token', req.cookies.token);
            if(req.query.email!== req.user.email)
            {
                return res.status(403).send({message: 'FORbidden access'})
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingcollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingcollection.insertOne(booking);
            res.send(result);
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                },
            };
            const result = await bookingcollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingcollection.deleteOne(query);
            res.send(result);
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`);
})