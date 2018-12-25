let express = require('express'),
	Todo = require('./todo'),
	bodyParser = require('body-parser'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	BearerStrategy =  require('passport-http-bearer').Strategy,
	jwt = require('jwt-simple'),
	Sequelize = require('sequelize'),
	TodoFactory = require('../models/todo'),
	ADMIN = 'admin',
	ADMIN_PASSWORD = 'password',
	SECRET = 'mysecret'

let sequelize = new Sequelize('postgres://myuser:OBMITTED@localhost/mydb')

sequelize
  .authenticate()
  .then(() => {
    let Todo = TodoFactory(sequelize, Sequelize)

	let app = express()
	app.use(bodyParser.json())

	// no cache!
	app.use((req, res, next) => {
	  res.setHeader('cache-control', 'private, max-age=0, no-cache, no-store, must-revalidate')
	  res.setHeader('expires', '0')
	  res.setHeader('pragma', 'no-cache')
	  next()
	})

	// authentication & authorization
	passport.use(new LocalStrategy((username, password, done) => {
	  if (username === ADMIN && password === ADMIN_PASSWORD) {
	    done(null, jwt.encode({ username }, SECRET))
	    return
	  }
	  done(null, false)
	}))

	passport.use(new BearerStrategy((token, done) => {
	  try {
	    const { username } = jwt.decode(token, SECRET)
	    if (username === ADMIN) {
	      done(null, username)
	      return;
	    }
	    done(null, false)
	  } catch (error) {
	    done(null, false)
	  }
	}))

	app.post(
	  '/login',
	  passport.authenticate('local', { session: false }),
	  (req, res) => {
	    res.send({
	      token: req.user,
	    })
	  },
	)

	// basic routes
	// TODO: handle errors
	app.get('/todos', passport.authenticate('bearer', { session: false }), (_, res) => {
	  Todo.findAll().then((todos) => {
	    res.send(todos)
	  })
	})

	// FIXME add note in the proper way...
	app.post('/todos', passport.authenticate('bearer', { session: false }), (req, res) => {
	  Todo.create({ note: req.body.note })
	    .then((todo) => {
	      res.send(todo)
	    })
	})

	app.delete('/todos/:id', passport.authenticate('bearer', { session: false }), (req, res) => {
	  Todo.findById(req.params.id)
	    .then(todo => todo.destroy())
	    .then(() => res.send())
	})

	// port info
	app.listen(3000, () => console.log('App listening on port 3000.'))
}).catch((err) => {
   console.error('Unable to connect to the database:', err);
 })
