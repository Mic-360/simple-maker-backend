const mongoose = require("mongoose");

const expertSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
});

const dateSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
});

const timeSchema = new mongoose.Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
});

const eventSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: dateSchema, required: true },
  time: { type: timeSchema, required: true },
  ticket: {
    type: {
      type: String, // Changed to typeName due to reserved word
      required: true,
    },
    price: { type: Number, required: true },
  },
  ticketLimit: { type: Number, required: true },
  imageLinks: [{ type: String }],
  description: { type: String, required: true },
  agenda: { type: String, required: true },
  location: { type: String, required: true },
  experts: [expertSchema],
  makerSpace: { type: String, required: true },
  status: { type: String, required: true },
});

module.exports = mongoose.model("Event", eventSchema);
