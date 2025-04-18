const express = require('express')
const app = express()
const mongoose = require('mongoose');
const cors = require('cors')
require('dotenv').config()

const user = require('./models/user');
const exercise = require('./models/exercise');

app.use(cors())

app.use(express.urlencoded({ extended: false }));

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.post('/api/users',async(req,res)=>{
  console.log(req.body);
  const username = req.body.username;
  try{
    const newuser = new user({username});
    const savedUser = await newuser.save();
    
    res.json({
      username : savedUser.username,
      _id : savedUser._id
    })
  } catch(err){
    console.log(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users',async (req,res)=>{
  try{
    const userarray = await user.find({},'username _id');
    res.json(userarray);
  }
  catch(err){
    res.status(500).json({error:'Failed to fetch users'});
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const foundUser = await user.findById(id);
    if (!foundUser) return res.json({ error: 'User not found' });

    const newExercise = new exercise({
      userId: id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: foundUser._id,
      username: foundUser.username,
      date: savedExercise.date.toDateString(), 
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});



app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const foundUser = await user.findById(_id);
    if (!foundUser) return res.json({ error: 'User not found' });

    const filter = { userId: _id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let logsQuery = exercise.find(filter).select('description duration date');

    if (limit) logsQuery = logsQuery.limit(parseInt(limit));

    const logs = await logsQuery.exec();

    const formattedLogs = logs.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString() 
    }));

    res.json({
      _id: foundUser._id,
      username: foundUser.username,
      count: formattedLogs.length,
      log: formattedLogs
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
