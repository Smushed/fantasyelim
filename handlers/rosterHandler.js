const db = require(`../models`);
const weekDates = require(`../constants/weekDates`);
const { DateTime } = require('luxon');

//This is here for when a user adds or drops a player. It fills out the object of the current week with 0s
fillOutRoster = (dbReadyRoster) => {
    const positions = [`QB`, `RB1`, `RB2`, `WR1`, `WR2`, `Flex`, `TE`, `K`];
    let filledRoster = {};

    //Iterate through the positions and ensure that it is full
    //This is done in case a user drops a player without adding a new one
    positions.forEach(position => {
        filledRoster[position] = dbReadyRoster[position] || 0;
    });

    return filledRoster;
};

usedPlayersInReactTableFormat = (sortedPlayers) => {
    let checkLongest = 0;
    let arrayForTable = [];
    if (sortedPlayers.RB.length > sortedPlayers.WR.length) {
        checkLongest = sortedPlayers.RB.length;
    } else {
        checkLongest = sortedPlayers.WR.length;
    };

    for (let i = 0; i < checkLongest; i++) {
        arrayForTable[i] = {};
        if (typeof sortedPlayers.QB[i] !== `undefined`) {
            arrayForTable[i].QB = sortedPlayers.QB[i];
        };
        if (typeof sortedPlayers.RB[i] !== `undefined`) {
            arrayForTable[i].RB = sortedPlayers.RB[i];
        };
        if (typeof sortedPlayers.WR[i] !== `undefined`) {
            arrayForTable[i].WR = sortedPlayers.WR[i];
        };
        if (typeof sortedPlayers.TE[i] !== `undefined`) {
            arrayForTable[i].TE = sortedPlayers.TE[i];
        };
        if (typeof sortedPlayers.K[i] !== `undefined`) {
            arrayForTable[i].K = sortedPlayers.K[i];
        };
    };
    return arrayForTable;
};

checkForAvailablePlayers = (usedPlayers, searchedPlayers) => {
    //usedPlayers is the array from the database of all players that the user has used
    //We need to grab ALL the playerIds that are currently active in the database and pull out any that are in the usedPlayers array

    //This turns the array into a set which then we iterate over the fantasy players we pulled from the DB and pull out duplicates
    const usedPlayerSet = new Set(usedPlayers);

    //This creates an array of objects. We need to turn this into an object for all the players and an array of all player Ids
    let availablePlayerArray = searchedPlayers.filter((player) => !usedPlayerSet.has(player.mySportsId));

    const availablePlayerIdArray = availablePlayerArray.map(({ mySportsId }) => mySportsId);

    const responseAvailablePlayers = { idArray: availablePlayerIdArray };

    for (const player of availablePlayerArray) {
        //Go through the object that was given to us
        //Declaring what needs to be declared for the nested objects
        responseAvailablePlayers[player.mySportsId] = {};

        //Parsing the roster and pulling in all the data we need
        responseAvailablePlayers[player.mySportsId].full_name = player.full_name;
        responseAvailablePlayers[player.mySportsId].mySportsId = player.mySportsId;
        responseAvailablePlayers[player.mySportsId].position = player.position;
    };

    return responseAvailablePlayers;
};

sortPlayersByRank = (playerArray) => {
    playerArray.sort((a, b) => { return a.ranking - b.ranking });
    return playerArray;
};

getUsedPlayers = async (userId, season) => {
    const currentUser = await db.UserRoster.findOne({ userId: userId }).exec();

    return currentUser.roster[season].usedPlayers;
};

module.exports = {
    byRoster: async () => {
        const players = await db.FantasyStats.find({ 'team.abbreviation': 'CHI' })

        return players
    },
    userRoster: async function (userId, week, season) {
        //This goes and grabs the user's roster that the page is currently on
        const currentRoster = await db.UserRoster.findOne({ userId: userId });

        //Parse the data we pulled out of the database and send it back in a useable format
        const parsedRoster = await this.getRosterPlayers(currentRoster, season, week)

        return parsedRoster;
    },
    dummyRoster: async (userId, week, season, dummyRoster) => { //Brute force updating a user's roster
        return new Promise((res, rej) => {
            db.UserRoster.findOne({ userId: userId }, (err, userRoster) => {
                const currentRoster = userRoster.roster[season][week].toJSON(); //Need to toJSON to chop off all the Mongo bits
                const currentUsedPlayerArray = userRoster.roster[season].usedPlayers;
                const currentRosterArray = Object.values(currentRoster);

                //Need to filter out all the 0s before we try and save it down into usedPlayers
                const filteredRosterArray = currentRosterArray.filter(playerId => playerId !== 0);
                const currentRosterSet = new Set(filteredRosterArray);
                //Filter out all the players that we removed from the roster that was in there
                const usedPlayers = currentUsedPlayerArray.filter((playerId) => !currentRosterSet.has(playerId));

                //TODO Some kind of flag or throw an error if the dummy player is already in there
                const dummyRosterArray = Object.values(dummyRoster);
                for (const player of dummyRosterArray) {
                    if (parseInt(player) !== 0) {
                        usedPlayers.push(player);
                    };
                };

                userRoster.roster[season][week] = dummyRoster;
                userRoster.roster[season].usedPlayers = usedPlayers;

                userRoster.save((err, result) => {
                    if (err) {
                        //TODO Better error handling
                        console.log(err);
                    } else {
                        res(result);
                    };
                });
            });
        });
    },
    getRosterPlayers: async (currentRoster, season, week) => {
        //Goes through the roster of players and pulls in their full data to then display
        currentRoster = currentRoster.roster[season][week].toObject(); //Must be toJSON otherwise there will be mongo built in keys and methods

        rosterArray = Object.values(currentRoster);

        const responseRoster = [];
        for (const player of rosterArray) {
            if (player !== 0) {
                //Go through the object that was given to us
                const response = await db.FantasyStats.findOne({ mySportsId: player }, { mySportsId: 1, full_name: 1, position: 1 })
                responseRoster.push(response)
            };
        };

        //We also return the array so the drag & drop component can populate this without having to pull it again
        return responseRoster;
    },
    availablePlayers: async (userId, searchedPosition, season) => {

        const usedPlayers = await getUsedPlayers(userId, season);

        //usedPlayers is the array from the database of all players that the user has used
        //We need to grab ALL the playerIds that are currently active in the database and pull out any that are in the usedPlayers array
        const searchedPlayers = await db.FantasyStats.find({ active: true, position: searchedPosition }, { mySportsId: 1, full_name: 1, position: 1, rank: 1 });

        const availablePlayers = checkForAvailablePlayers(usedPlayers, searchedPlayers);

        return availablePlayers;
    },
    updateUserRoster: async (userId, dbReadyRoster, droppedPlayer, week, season, saveWithNoDrop) => {

        return new Promise((res, rej) => {
            db.UserRoster.findOne({ userId }, (err, currentRoster) => {
                //If the player is adding someone from the available player pool we remove the player they dropped and add the new player

                if (parseInt(droppedPlayer) !== 0) {
                    //Pulling the player they dropped out of the usedArray
                    const playerIndex = currentRoster.roster[season].usedPlayers.indexOf(parseInt(droppedPlayer));
                    currentRoster.roster[season].usedPlayers.splice(playerIndex, 1);

                    //Figuring out the player they just added to the array
                    //TODO Refactor this out. We use this exact thing below and for dummyRoster
                    const newRoster = Object.values(dbReadyRoster);
                    const dbSet = new Set(currentRoster.roster[season].usedPlayers);
                    const addedPlayer = newRoster.filter((playerId) => !dbSet.has(playerId));
                    if (addedPlayer.length !== 0) { //This checks if they dropped the only player for the current week
                        currentRoster.roster[season].usedPlayers.push(addedPlayer[0]);
                    };
                };

                if (saveWithNoDrop) {
                    const newRoster = Object.values(dbReadyRoster);
                    const dbSet = new Set(currentRoster.roster[season].usedPlayers);
                    const addedPlayer = newRoster.filter((playerId) => !dbSet.has(playerId));
                    currentRoster.roster[season].usedPlayers.push(addedPlayer[0]);
                };

                //Fills out the roster with 0s. This is in case a user drops a player without adding a new one
                const filledOutRoster = fillOutRoster(dbReadyRoster);

                //This iterates through the positions on the dbReadyRoster provided from the client and puts the players they want in the correct positions without overwriting the 0s
                Object.keys(filledOutRoster).forEach(position => {
                    currentRoster.roster[season][week][position] = filledOutRoster[position];
                });


                currentRoster.save((err, result) => {
                    if (err) {
                        //TODO Better error handling
                        res(err);
                    } else {
                        res(result);
                    };
                });
            });
        });
    },
    getAllRosters: async (season) => {
        //TODO Error handling
        return new Promise(async (res, rej) => {
            const rosterList = {};

            //Use the Exec for full promises in Mongoose
            const rosters = await db.UserRoster.find({}).exec();
            rosters.forEach(roster => rosterList[roster.userId] = { roster: roster.roster[season] });
            res(rosterList);
        });
    },
    checkLockPeriod: () => {
        const currentTime = DateTime.local().setZone(`America/Chicago`);
        const year = parseInt(currentTime.c.year);
        let lockYear = ``;

        if (year === 2020) {
            lockYear = `2019-2020-regular`;
        } else if (year === 2019) {
            lockYear = `2018-2019-regular`;
        };

        //Check if it's week 0
        if (currentTime < DateTime.fromISO(weekDates[year].lockDates[0].lockTime)) {
            return 0;
        };
        //Breaking this out to it's own function to ensure that people aren't saving their rosters past the lock period
        //If this wasn't it's own function and relied on the client to define the lock
        for (let i = 16; i >= 0; i--) { //Going down to check for the latest locked week
            if (currentTime > DateTime.fromISO(weekDates[year].lockDates[i].lockTime)) {
                return { lockWeek: weekDates[year].lockDates[i].lockWeek, lockYear };
            };
        };
    },
    usedPlayersForTable: async (userId, season) => {
        const sortedPlayers = { 'QB': [], 'RB': [], 'WR': [], 'TE': [], 'K': [] };
        let usedPlayerArray = [];
        let arrayForTable = [];

        const currentRoster = await db.UserRoster.findOne({ userId }).exec();
        usedPlayerArray = currentRoster.roster[season].usedPlayers;

        for (let i = 0; i < usedPlayerArray.length; i++) {
            let player = await db.FantasyStats.findOne({ mySportsId: usedPlayerArray[i] }, { position: 1, full_name: 1 });
            sortedPlayers[player.position].push(player.full_name);
        };

        arrayForTable = usedPlayersInReactTableFormat(sortedPlayers);

        return arrayForTable;
    },
    searchPlayerByTeam: async (userId, team, season) => {

        const usedPlayers = await getUsedPlayers(userId, season);

        const playersByTeam = await db.FantasyStats.find({ 'team.abbreviation': team }, { mySportsId: 1, full_name: 1, position: 1 });

        const availablePlayers = checkForAvailablePlayers(usedPlayers, playersByTeam);

        return availablePlayers;
    }
};