let express = require('express'),
	Todo = require('./todo'),
	bodyParser = require('body-parser'),
	multer = require('multer'),
	upload = multer(),
	methodOverride = require('method-override'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	BearerStrategy =  require('passport-http-bearer').Strategy,
	jwt = require('jwt-simple'),
	Sequelize = require('sequelize'),
	request = require('request'),
	TodoFactory = require('../models/todo'),
	ADMIN = 'admin',
	ADMIN_PASSWORD = 'password',
	SECRET = 'mysecret'

let sequelize = new Sequelize('postgres://myuser:OBMITTED@localhost/mydb')
let authToken

sequelize
  .authenticate()
  .then(() => {
    let Todo = TodoFactory(sequelize, Sequelize)

	let app = express()
	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true })); 
	app.use(upload.array()); 
	app.use(express.static('public'));
	app.use(methodOverride('_method'));

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
	  	authToken = req.user
	  	res.redirect('/todos/?token=' + req.user)
	  },
	)

	// basic routes
	app.get('/todos', (req, res) => {
		if (req.query.token === authToken) {
			Todo.findAll({ raw: true }).then((todos) => {
		    res.render('todos', { data: JSON.stringify(todos), token: req.query.token })
		  })
		} else {
			res.redirect('/')
		}	  
	})

	app.post('/todos', (req, res) => {
		if (authToken) {
			Todo.create({ note: req.body.note })
		    .then((todo) => {
		      res.redirect('/todos/?token=' + authToken)
		    })
		} else {
			res.redirect('/')
		}
	})

	app.post('/todos/delete', (req, res) => {
		if (authToken) {
		  Todo.findById(req.body.id)
			.then(todo => todo.destroy())
			.then(() => res.redirect('/todos/?token=' + authToken))
		} else {
			res.redirect('/')
		}
	})

	// frontend part
	app.set('view engine', 'pug')
	app.get('/', (req, res) => {
		res.render('login')
	})
	app.get('/addpage', (req, res) => {
		res.render('add')
	})
	app.get('/deletepage', (req, res) => {
		res.render('delete', { token: req.query.token })
	})

	// port info
	app.listen(3000, () => console.log('App listening on port 3000.'))
}).catch((err) => {
   console.error('Unable to connect to the database:', err);
 })
