/*
  User related controllers
*/

// model
const User = require('../models/user');
const Recipe = require('../models/recipe');
const Bookmark = require('../models/bookmark');

// package
const bcrypt = require('bcrypt');

// bookmark a recipe
module.exports.bookmarkRecipe = async (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.profile._id;
  try {
    let bookmarked = await Bookmark.findOne({ user: userId, recipe: recipeId });
    if (bookmarked) {
      await bookmarked.remove();
      await Recipe.findOneAndUpdate(
        { _id: recipeId },
        { $inc: { bookmarks: -1 } }
      );
    } else {
      bookmarked = new Bookmark({
        user: userId,
        recipe: recipeId
      });
      await bookmarked.save();
      await Recipe.findOneAndUpdate(
        { _id: recipeId },
        { $inc: { bookmarks: 1 } }
      );
    }
    return res.status(200).json({
      message: 'Success bookmark'
    });
  } catch (err) {
    console.log(err);
  }
};

// list all recipes based on userId
module.exports.listUserRecipe = async (req, res) => {
  const userId = req.params.userId;
  const orderBy = req.query.orderBy ? req.query.orderBy : '-createdAt';
  const size = req.query.size ? Number(req.query.size) : 10;
  const page = req.query.page ? Number(req.query.page) : 1;
  const skip = (page - 1) * size;
  const search = req.query.search;
  try {
    if (!search) {
      const response = await Recipe.find({ postedBy: userId })
        .select('-ingredients')
        .populate('categories', 'name')
        .sort(orderBy)
        .limit(size)
        .skip(skip);
      return res.status(200).json(response);
    } else {
      const response = await Recipe.find({
        postedBy: userId,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      })
        .select('-ingredients')
        .populate('categories', 'name')
        .sort(orderBy)
        .limit(size)
        .skip(skip);
      return res.status(200).json(response);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: 'Something went wrong..'
    });
  }
};

// retrieve user details
module.exports.readUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findOne({ _id: userId }).select('-role');
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    return res.status(200).json(user);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json({
      error: 'Something went wrong..'
    });
  }
};

// retrieve user bookmarks
module.exports.listUserBookmarks = async (req, res) => {
  const userId = req.profile._id;
  try {
    const bookmarks = await Bookmark.find({ user: userId }).populate({
      path: 'recipe',
      select: 'thumbImageUrl likes bookmarks rating title description postedBy',
      populate: { path: 'postedBy', select: 'username photoUrl' }
    });
    return res.status(200).json(bookmarks);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json({
      error: 'Something went wrong..'
    });
  }
};

// update user details
module.exports.updateUser = async (req, res) => {
  const userId = req.profile._id;
  const { username, about, photoUrl } = req.body;
  try {
    const nameExist = await User.findOne({ username, _id: { $ne: userId } });
    if (nameExist) {
      return res.status(403).json({
        error: 'Username is token'
      });
    }
    const user = await User.findOne({ _id: userId }).select('-role');
    user.username = username;
    user.about = about;
    user.photoUrl = photoUrl;
    await user.save();
    return res.status(200).json(user);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json({
      error: 'Something went wrong..'
    });
  }
};

// update user password
module.exports.updatePassword = async (req, res) => {
  const userId = req.profile._id;
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ _id: userId }).select('+hashed_password');
    const passwordMatch = await bcrypt.compare(
      oldPassword,
      user.hashed_password
    );
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Password does not match'
      });
    } else {
      const newHashed_password = await bcrypt.hash(newPassword, 10);
      user.hashed_password = newHashed_password;
      await user.save();
      return res.status(200).json({
        message: 'Successfully updated password'
      });
    }
  } catch (err) {
    console.log('Error', err);
  }
};
