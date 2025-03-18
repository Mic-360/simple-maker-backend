const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  linkedin: { type: String, required: true },
  image: { type: String, required: true },
});

const makerspaceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  type: { type: String, required: true },
  usage: [{ type: String }],
  name: { type: String, required: true },
  description: { type: String, required: true },
  email: { type: String, required: true },
  number: { type: String, required: true },
  inChargeName: { type: String, required: true },
  websiteLink: { type: String, required: true },
  timings: {
    monday: { type: String, required: true },
    tuesday: { type: String, required: true },
    wednesday: { type: String, required: true },
    thursday: { type: String, required: true },
    friday: { type: String, required: true },
    saturday: { type: String, required: true },
    sunday: { type: String, required: true },
  },
  city: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  zipcode: { type: String, required: true },
  country: { type: String, required: true },
  organizationName: { type: String, required: true },
  organizationEmail: { type: String, required: true },
  imageLinks: [{ type: String }],
  logoImageLinks: [{ type: String }],
  googleMapLink: { type: String, required: true },
  howToReach: [{ type: String }],
  amenities: [{ type: String }],
  mentors: [mentorSchema],
  instructions: { type: String, required: true },
  additionalInformation: { type: String, required: true },
  rating: { type: Number, required: true },
  status: { type: String, required: true },
});

module.exports = mongoose.model("Makerspace", makerspaceSchema);
