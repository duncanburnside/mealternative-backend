/*
  Category model
*/

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    require: true,
    minlength: 3,
    maxlength: 50,
    unique: true
  }
});

module.exports = mongoose.model('Category', categorySchema);
