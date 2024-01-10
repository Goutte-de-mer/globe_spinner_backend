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

// addPaymentInfo

router.post("/:userToken/addPaiyementInfo", async (req, res) => {
  try {
    const user = await User.findById(userToken);

    const userToken = req.params.userToken;
    const { nameOnCard, cardNumber, expiryDate, code } = req.body;

    if (!user) {
      return res
        .status(404)
        .json({ result: false, message: "Utilisateur non trouvé" });
    }

    user.bankCardInfo.nameOnCard = nameOnCard;
    user.bankCardInfo.cardNumber = cardNumber;
    user.bankCardInfo.expiryDate = new Date(expiryDate);
    user.bankCardInfo.code = code;

    await user.save();

    res.status(200).json({
      result: true,
      message: "Informations de paiement enregistrées avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      result: false,
      message: "Erreur lors de l'enregistrement des informations de paiement",
    });
  }
});

router.post("/:userToken/resetPassword", async (req, res) => {
  if (!checkBody(req.body, ["newPassword"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }
  const newHash = bcrypt.hashSync(req.body.newPassword, 10);
  const operation = await User.updateOne(
    { token: req.params.userToken },
    { password: newHash }
  );
  if (operation.modifiedCount === 0)
    return res.json({ result: false, error: "Couldn't reset user's password" });
  res.json({ result: true });
});

module.exports = router;
