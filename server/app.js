const http = require('http')
const path = require('path')
const socketIo = require('socket.io')
const needle = require('needle')
const express = require('express')
const config = require('dotenv').config()
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 3001
const TOKEN = process.env.TWITTER_BEARER_TOKEN

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const rules = []

app.get('/',(req,res,next) => {
    res.sendFile(path.resolve(__dirname,'../','client','index.html'))
})

app.post('/tweet',(req,res,next) => {

    rules.pop()
    rules.push(req.body)
    res.sendFile(path.resolve(__dirname,'../','client','index.html'))
})

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'

// const rules = [{ value : `coding` }]

// Get stream rules
async function getRules() { 
    const response = await needle('get', rulesURL, {
        headers :{
            Authorization : `Bearer ${TOKEN}`
        },
    })

    // console.log(response.body);
    return response.body
}

// Set stream rules
async function setRules() {

    const data = {
        add : rules
    }

    const response = await needle('post', rulesURL,data, {
        headers :{
            'content-type' : 'application/json',
            Authorization : `Bearer ${TOKEN}`
        },
    })

    return response.body
}

// Delete stream rules
async function deleteRules(rules) {
    console.log("rules");
    console.log(rules);

    if(!Array.isArray(rules.data)){
        console.log("This is if");
        console.log(rules.data);
        return null
    }

    const ids = rules.data.map((rule) => rule.id)
    console.log("ids");
    console.log(ids);

    const data = {
        delete : {
            ids : ids
        }
    }

    const response = await needle('post', rulesURL,data, {
        headers :{
            'content-type' : 'application/json',
            Authorization : `Bearer ${TOKEN}`
        },
    })

    return response.body
}

// tweets
function streamTweets(socket){
    const stream = needle.get(streamURL, {
        headers : {
            Authorization : `Bearer ${TOKEN}`
        },
    })

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data)
            // console.log(json);
            socket.emit('tweet',json)
            
        } catch (error) {
            
        }
    })
}

io.on('connection', async () => {
    console.log('Client connected......!');

    try {       
        let currentRules
        currentRules = await getRules()
        // to delete rules
        await deleteRules(currentRules)
        console.log(rules.length);
        // to get rules
                
        // to setRules
        await setRules()
       
    } catch (error) {
        console.log("error" + error);
        process.exit(1)
    } 
        streamTweets(io)

})


server.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
})