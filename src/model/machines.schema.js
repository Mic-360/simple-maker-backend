const mongoose = require("mongoose");

const inChargeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
});

const machineSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  time: { type: timeSchema, required: true },
  imageLinks: [{ type: String }],
  description: { type: String, required: true },
  location: { type: String, required: true },
  instruction: { type: String, required: true },
  inCharge: [inChargeSchema],
  makerSpace: { type: String, required: true },
  status: { type: String, required: true },
  rating: { type: Number, required: true },
});

module.exports = mongoose.model("Machine", machineSchema);
