require("dotenv").config();
require("./database/connection");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const TransportBase = require("./database/models/transport/transportBases");
const TransportSlot = require("./database/models/transport/transportSlots");

const Destination = require("./database/models/destinations");

function getRandomValue(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(startDateString, endDateString) {
  const momentStart = moment(startDateString, "YYYY-MM-DD");
  const momentEnd = moment(endDateString, "YYYY-MM-DD");

  const startMillis = momentStart.valueOf();
  const endMillis = momentEnd.valueOf();
  const randomMillis = startMillis + Math.random() * (endMillis - startMillis);

  const randomMoment = moment(randomMillis);
  const date = randomMoment.toDate();
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

// function creatAvailableFirstClassSeats() {
//   const seats = [];
//   for (let i = 1; i <= 16; i++) {
//     seats.push(`${i}A`);
//     seats.push(`${i}B`);
//     seats.push(`${i}C`);
//     seats.push(`${i}D`);
//     seats.push(`${i}E`);
//     seats.push(`${i}F`);
//   }
//   return seats;
// }

// function creatAvailableSecondClassSeats() {
//   const seats = [];
//   for (let i = 17; i <= 20; i++) {
//     seats.push(`${i}A`);
//     seats.push(`${i}B`);
//     seats.push(`${i}C`);
//     seats.push(`${i}D`);
//     seats.push(`${i}E`);
//     seats.push(`${i}F`);
//   }
//   return seats;
// }

const pushMany = async () => {
  const documents = [];
  const transportBases = await TransportBase.find();
  const destinations = await Destination.find();

  for (let i = 0; i < 100_000; i++) {
    const randomIndex = Math.floor(Math.random() * transportBases.length);
    const randomTransportBase = transportBases[randomIndex];
    const departureDestIndex = Math.floor(Math.random() * destinations.length);
    const departureDest = destinations[departureDestIndex]._id;
    const arrivalDestIndex = Math.floor(Math.random() * destinations.length);
    const arrivalDest = destinations[arrivalDestIndex]._id;

    const departureDate = getRandomDate("2023-12-12", "2024-03-30");
    const duration = getRandomValue(20, 500); // entre 20 min et 500 min
    const arrivalDate = moment(departureDate.toISOString())
      .add(duration, "minutes")
      .toDate();

    const secondClassPrice = getRandomValue(20, 200);
    const firstClassPrice = secondClassPrice * 1.4;

    const obj = {
      transportBase: new ObjectId(randomTransportBase._id),
      departure: {
        place: departureDest,
        date: departureDate,
      },
      arrival: {
        place: arrivalDest,
        date: arrivalDate,
      },
      firstClass: {
        price: firstClassPrice,
        maxNbSeats: 20,
        //availableSeats: creatAvailableFirstClassSeats(),
        nextAvailableSeat: '1A',    // rows A, B and C
      },
      secondClass: {
        price: secondClassPrice,
        maxNbSeats: 80,
        //availableSeats: creatAvailableSecondClassSeats(),
        nextAvailableSeat: '6C',    // rows A, B and C
      },
    };

    documents.push(obj);
  }

  return documents;
};

pushMany().then((docs) => {
  TransportSlot.insertMany(docs)
    .then((docs) => console.log(`Inserted ${docs.length}`))
    .catch((err) => console.error(err));
});
