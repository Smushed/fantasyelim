require(`dotenv`).config();
const userHandler = require(`../handlers/userHandler`);
const groupHandler = require(`../handlers/groupHandler`);
const scoringSystem = require(`../constants/scoringSystem`);

module.exports = app => {

    app.put(`/api/requestJoinGroup`, async (req, res) => {
        const { userId, groupId } = req.body;

        await groupHandler.addUser(userId, groupId);
        await userHandler.addGroupToList(userId, groupId);
        res.status(200).send(`Added`);
        // return "You need to be a moderator to add users to the group";
    });

    app.get(`/api/getgroupdata/:groupID`, async (req, res) => {
        try {
            const groupID = req.params.groupID;
            const groupData = await groupHandler.getGroupData(groupID);
            if (groupData) {
                res.status(200).send(groupData);
            } else {
                res.status(500).send({ 'error': `No Group Found` })
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    app.post(`/api/createClapper/:pass`, async (req, res) => {
        const { pass } = req.params;
        if (pass !== process.env.DB_ADMIN_PASS) {
            res.status(401).send(`Get Outta Here!`);
            return;
        };
        groupHandler.createClapper();
        userHandler.initSeasonAndWeekInDB();
        console.log(`Group Created`)
        res.sendStatus(200);
    });

    app.get(`/api/getGroupPositions/:groupId`, async (req, res) => {
        const { groupId } = req.params;
        const positions = await groupHandler.getGroupPositions(groupId);
        res.status(200).send(positions);
    });

    app.get(`/api/getGroupPositionsForDisplay/:groupId`, async (req, res) => {
        const { groupId } = req.params;
        const positions = await groupHandler.getGroupPositions(groupId);
        const forDisplay = await groupHandler.groupPositionsForDisplay(positions);
        res.status(200).send({ positions, forDisplay });
    });

    app.get(`/api/getScoring`, async (req, res) => {
        res.status(200).send(scoringSystem);
    });

    app.post(`/api/createGroup`, async (req, res) => {
        const { userId, newGroupScore, groupName, groupDesc, groupPositions } = req.body;
        const groupResponse = await groupHandler.createGroup(userId, newGroupScore, groupName, groupDesc, groupPositions);
        const addUserResponse = await groupHandler.addUser(userId, groupResponse._id, true);
        console.log(addUserResponse)
        res.status(200).send(addUserResponse);
    });

    app.get(`/api/getGroupList`, async (req, res) => {
        const dbResponse = await groupHandler.getGroupList();
        res.status(200).send(dbResponse);
    });
};