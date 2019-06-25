const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    data: {
        x: {type: Number, default: 300},
        y: {type: Number, default: 300},
        characterType: {type: Number, default: 1}
    }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);