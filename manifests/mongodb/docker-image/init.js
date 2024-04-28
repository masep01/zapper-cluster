db.createCollection("users");
db.users.insert({
  username: "zapper",
  password: "root",
  createdAt: new Date()
});
