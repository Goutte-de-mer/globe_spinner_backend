require('dotenv').config();
require('../../connection');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const AccommodationBase = require('../../models/accommodation/accommodationBases'); 
const AccommodationSlot = require('../../models/accommodation/accommodationSlots'); 
const AccommodationExtra = require('../../models/accommodation/accommodationExtras'); 


function getRandomSubset(arr, maxLength) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const length = getRandomIndex(maxLength);
    return arr.slice(0, length);
}

function getRandomIndex(maxIndex){
    return Math.floor(Math.random() * maxIndex);
}


Promise.all([
    AccommodationBase.find(),
    AccommodationSlot.find(),
    AccommodationExtra.find(),
])
.then(([bases, slots, extras, destinations]) => {
    bases.forEach(base => {
        const randomExtras = getRandomSubset(extras, 5);
        const extraIds = randomExtras.map(extra => new ObjectId(extra._id));
        base.possibleExtras = extraIds;
        base.save();
    });
    slots.forEach(slot => {
        const randomBase = bases[getRandomIndex(bases.length)];
        slot.accommodationBase = new ObjectId(randomBase._id);
        slot.save();
    });
});