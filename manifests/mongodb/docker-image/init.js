db.createCollection("users");

db.createUser({
  user: "root",
  pwd: "elnano33!",
  roles: ["readWrite"]
});

db.users.insert({
  username: "josep",
  password: "eljefe",
  createdAt: new Date()
});
