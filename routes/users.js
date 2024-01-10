var express = require("express");
var router = express.Router();
const uid2 = require("uid2");
const User = require("../database/models/users");
const { checkBody } = require("../modules/checkbody");
const { saveTrip } = require("../modules/saveTrip");
const bcrypt = require("bcrypt");

router.post("/signup", (req, res) => {
  if (!checkBody(req.body, ["email", "password", "firstName", "lastName"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: req.body.email }).then((data) => {
    if (data === null) {
      const hash = bcrypt.hashSync(req.body.password, 10);

      const newUser = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hash,
        token: uid2(32),
        savedTrips: [],
        reservedTrips: [],
        bankCard: {
          cardNumber: "",
          expiryDate: new Date("9999-12-31T23:59:59"),
          CVV: String,
        },
      });

      newUser.save().then((newDoc) => {
        res.json({ result: true, token: newDoc.token });
      });
    } else {
      // Utilisateur existe déjà
      res.json({ result: false, error: "User already exists" });
    }
  });
});

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  User.findOne({ email: req.body.email }).then((data) => {
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
      return res.json({
        result: true,
        token: data.token,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    } else {
      return res.json({
        result: false,
        error: "User not found or wrong password",
      });
    }
  });
});

// ----------------- :/userToken ----------------

router.get("/:userToken/reservedTrips", (req, res) => {
  const token = req.params.userToken;
  User.findOne({ token })
    .populate("reservedTrips")
    .then((data) => {
      return res.json(data.reservedTrips);
    });
});

router.get("/:userToken/savedTrips", (req, res) => {
  const token = req.params.userToken;
  User.findOne({ token })
    .populate({
      path: "savedTrips",
      populate: [
        { path: "destination" },
        {
          path: "outboundJourney",
          populate: [
            {
              path: "transportSlot",
              populate: [
                { path: "transportBase" },
                { path: "departure", populate: "place" },
                { path: "arrival", populate: "place" },
              ],
            },
            { path: "transportExtras" },
          ],
        },
        {
          path: "inboundJourney",
          populate: [
            {
              path: "transportSlot",
              populate: [
                { path: "transportBase" },
                { path: "departure", populate: "place" },
                { path: "arrival", populate: "place" },
              ],
            },
            { path: "transportExtras" },
          ],
        },
        {
          path: "accommodation",
          populate: [
            { path: "accommodationRoom", populate: "accommodationBase" },
            { path: "accommodationExtras" },
          ],
        },
        {
          path: "activities",
          populate: [
            { path: "activitySlot", populate: "activityBase" },
            { path: "activityExtras" },
          ],
        },
      ],
    })
    .then((user) => {
      return res.json(user.savedTrips);
    });
});

router.post("/:userToken/saveTrip/:tripIndex", async (req, res) => {
  const { userToken, savedTrip } = await saveTrip(req);

  const updateResult = await User.updateOne(
    { token: userToken },
    { $push: { savedTrips: savedTrip._id } }
  );
  if (updateResult.modifiedCount <= 0) {
    return res.json({ res: false });
  }
  return res.json({ savedTrip, res: true });
});

router.post("/:userToken/reserveTrip/:tripIndex", async (req, res) => {
  const { userToken, savedTrip } = await saveTrip(req);

  const updateResult = await User.updateOne(
    { token: userToken },
    { $push: { reservedTrips: savedTrip._id } }
  );
  return res.json({ savedTrip, updateResult });
});

module.exports = router;
