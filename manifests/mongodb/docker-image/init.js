db.createCollection("users");
db.createUser({
  user: "root",
  pwd: "password",
  roles: ["readWrite"]
});

db.users.insert({
  username: "josep",
  password: "eljefe",
  createdAt: new Date()
});
