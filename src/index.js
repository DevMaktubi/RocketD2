const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(req, res, next) {
  const {username} = req.headers
  const user = users.find((u) => u.username === username)

  if(!user){
    return res.status(404).json({error: "No user with that username found."})
  }
  req.user = user
  return next()
}

function checksCreateTodosUserAvailability(req, res, next) {
  const {user} = req
  if(user.pro !== true && user.todos.length >= 10){
    return res.status(403).json({error: "User has reached max todo's capacity."})
  }
  return next()
}

function checksTodoExists(req, res, next) {
  const {username} = req.headers
  const user = users.find((u) => u.username === username)

  if(!user) {
    return res.status(404).json({error: "No user found with that username."})
  }
  const {id} = req.params

  if(!validate(id)){
    return res.status(400).json({error:"Please provide a valid id."})
  }

  const todo = user.todos.find((t) => t.id === id)

  if(!todo) {
    return res.status(404).json({error: "No todo found with that id."})
  }
  req.user = user
  req.todo = todo
  return next()
}

function findUserById(req, res, next) {
  const {id} = req.params
  const user = users.find((u) => u.id === id)
  if(!user) {
    return res.status(404).json({error: "No user found with that id."})
  }
  req.user = user
  return next()
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};