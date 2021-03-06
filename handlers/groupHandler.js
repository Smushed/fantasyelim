const db = require(`../models`);

const checkDuplicate = async (checkedField, groupToSearch, userID) => {
    let result = false;
    let searched;
    switch (checkedField) {
        case `group`:
            try {
                searched = await db.Group.findOne({ N: groupToSearch }).exec();
                //If there is a group with that name return true
                if (searched !== null) {
                    result = true;
                };
            } catch (err) {
                console.log(err);
            };
            break;
        case `userlist`:
            //Grabs the group that the user is looking to add the user to 
            try {
                searched = await db.Group.findById(groupToSearch);
            } catch (err) {
                console.log(err);
            };
            try {
                const isInGroup = await searched.UL.filter(user => user._id === userID);
                if (isInGroup.length > 0) {
                    result = true;
                };
            } catch (err) {
                console.log(err);
            };
            break;
        case `userScore`:
            try {
                searched = await db.UserScores.findOne({ U: userID, G: groupToSearch }).exec();
                if (searched !== null) {
                    result = true;
                };
            } catch (err) {
                console.log(err);
            };
            break;
    }
    return result;
};

const getUserScoreList = async (groupId, season, prevWeek, week) => {
    return await db.UserScores.find({ G: groupId, S: season }, `U ${prevWeek} ${week} TS`).exec();
};

const createGroupRoster = async (groupId, rosterSpots) => {
    const dbResponse = db.GroupRoster.create({ G: groupId, P: rosterSpots });
    return dbResponse;
};

const createGroupScore = (groupId, groupScore) => {
    const { P, RU, RE, F, FG } = groupScore;
    db.GroupScore.create({ G: groupId, P, RU, RE, F, FG });
};

const createUserScore = async (userId, season, groupId) => {
    console.log(userId, season, groupId)
    const checkDupeUser = await checkDuplicate(`userScore`, userId, groupId);
    if (!checkDupeUser) {
        await db.UserScores.create({ U: userId, G: groupId, S: season });
    };
    return;
};

module.exports = {
    createGroup: async (userId, newGroupScore, groupName, groupDesc, groupPositions) => {
        if (!checkDuplicate('group', groupName)) { return false };
        const newGroup = {
            N: groupName,
            D: groupDesc
        };
        const newGroupFromDB = await db.Group.create(newGroup);
        createGroupRoster(newGroupFromDB._id, groupPositions);
        createGroupScore(newGroupFromDB._id, newGroupScore);
        //Add the new group to the user who created it
        await db.User.findByIdAndUpdate([userId], { $push: { GL: newGroupFromDB._id } }); //Also saved the group that the user just added to their profile

        return newGroupFromDB;
    },
    // Invite other users to the group
    addUser: async (addedUserID, groupId, isAdmin = false) => {
        //Checks if the user is already added to the group and returns 500 if they are
        const isDuplicate = await checkDuplicate(`userlist`, groupId, addedUserID);
        //TODO update this so it returns an error message
        if (isDuplicate) {
            return 500;
        };

        const newUserForGroup = {
            A: isAdmin,
            B: false,
            ID: addedUserID
        };

        //get the user ID, add them to the array userlist within the group
        const groupDetail = await db.Group.findByIdAndUpdate(groupId, { $push: { UL: newUserForGroup } }, { new: true });
        const dbResponse = await db.SeasonAndWeek.find({}).exec();
        await createUserScore(addedUserID, dbResponse[0].S, groupId);

        return groupDetail;
    },
    checkGroupMod: async (userID, groupID) => {
        //Looks up the group in the database
        const foundGroup = await db.Group.findById([groupID], err => { if (err) { console.log(err) } });
        //Finds the current user
        const currentUser = await foundGroup.userlist.find(users => users._id == userID);
        //Checks if that user is a mod and returns a boolean
        const isModerator = currentUser.isMod;
        return isModerator;
    },
    getGroupData: async (groupID) => {
        const groupData = await db.Group.findById([groupID]);
        return groupData;
    },
    getLeaderBoard: async (groupId, season, week, filledRosters) => {
        const arrayForLeaderBoard = [];
        const weekAccessor = (week === 1 ? 1 : week - 1).toString();
        const userScoreList = await getUserScoreList(groupId, season, weekAccessor, week);
        for (const user of userScoreList) {
            const { UN } = filledRosters.find(roster => roster.UID.toString() === user.U.toString());
            const filledOutUser = {
                UID: user.U,
                TS: user.TS,
                UN,
                CW: user[week],
                W: user[weekAccessor]
            };
            arrayForLeaderBoard.push(filledOutUser);
        };
        arrayForLeaderBoard.sort((a, b) => b.TS - a.TS);
        return arrayForLeaderBoard;
    },
    createClapper: async function () { //TODO Break this out to use the Create Group function above. Just not sure about the mod part
        //If there is no Dupe general group we are good to go ahead and add it
        if (!checkDuplicate('group', 'Clapper')) { return false };
        const clapper = {
            N: `Clapper`,
            D: `Everyone competing for the Clapper`
        };
        const clapperFromDB = await db.Group.create(clapper);
        this.createGroupRoster(clapperFromDB._id);
        this.createGroupScore(clapperFromDB._id);
        return `working`;
    },

    findGroupIdByName: async (groupName) => {
        const foundGroup = await db.Group.findOne({ N: groupName });

        return foundGroup._id;
    },
    createGeneralGroupRoster: async (groupId) => {
        const dbResponse = db.GroupRoster.create({ G: groupId });
        return dbResponse;
    },
    getGroupPositions: async (groupId) => {
        const dbResponse = await db.GroupRoster.findOne({ G: groupId });
        return dbResponse.P;
    },
    groupPositionsForDisplay: async (rawPositionData) => {
        const positionsToDisplay = [false, false, false, false, false, false]; //QB, RB, WR, TE, K, D
        for (const position of rawPositionData) {
            if (position.I === 0) {
                positionsToDisplay[0] = true;
            } else if (position.I === 1) {
                positionsToDisplay[1] = true;
            } else if (position.I === 2) {
                positionsToDisplay[2] = true;
            } else if (position.I === 3) {
                positionsToDisplay[3] = true;
            } else if (position.I === 4) {
                positionsToDisplay[4] = true;
            } else if (position.I === 5) {
                positionsToDisplay[5] = true;
            } else if (position.I === 6) {
                positionsToDisplay[1] = true;
                positionsToDisplay[2] = true;
            } else if (position.I === 7) {
                positionsToDisplay[1] = true;
                positionsToDisplay[2] = true;
                positionsToDisplay[3] = true;
            } else if (position.I === 8) {
                positionsToDisplay[0] = true;
                positionsToDisplay[1] = true;
                positionsToDisplay[2] = true;
                positionsToDisplay[3] = true;
            };
        };
        return positionsToDisplay;
    },
    getGroupScore: async (groupId) => {
        const dbResponse = await db.GroupScore.findOne({ G: groupId });
        return dbResponse;
    },
    mapGroupPositions: async (groupPositions, positionMap) => {
        const groupMap = [];
        for (const position of groupPositions) {
            groupMap.push(positionMap[position.I])
        };
        return groupMap;
    },
    getGroupList: async () => {
        const filledData = [];
        const groupResponse = await db.Group.find();

        for (let i = 0; i < groupResponse.length; i++) {
            filledData[i] = {
                N: groupResponse[i].N,
                D: groupResponse[i].D,
                id: groupResponse[i]._id,
                UL: []
            };
            for (let ii = 0; ii < groupResponse[i].UL.length; ii++) {
                const { UN } = await db.User.findById(groupResponse[i].UL[ii].ID);
                filledData[i].UL.push(UN);
            };
        };
        return filledData;
    }
};