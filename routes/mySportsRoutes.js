const mySportsHandler = require(`../handlers/mySportsHandler`);


module.exports = app => {

    app.get(`/api/updatePlayers/:season/:week`, async (req, res) => {
        const { season, week } = req.params;
        //This is a route which pulls in weekly data (should use params in the future)
        const response = await mySportsHandler.getWeeklyData(season, week)
        //getWeeklyData returns all player data for that week in an array
        //TODO this is not working properly
        //It is updating the  players in the DB but it is not sending the data back
        //Currently if this runs while there is no new players to add the front end will break

        res.status(200).send(response.text)

    });

    app.get(`/api/massplayerupdate`, async (req, res) => {
        const dbResponse = await mySportsHandler.getMassData();
        console.log(dbResponse);
        if (dbResponse.status === 200) {
            res.status(200).send(dbResponse.text)
        } else {
            //TODO Better error handling
            console.log(dbResponse.text)
        }
    });

    //This iterates through all the teams (all 32) and pulls mySportsFeeds for the current rosters
    //It then takes the rosters it gets from mySportsFeeds and updates the players it finds
    app.get(`/api/updateteams`, async (req, res) => {
        //TODO make this so you can feed in the season you want to change
        const season = `2019-2020-regular`

        const dbResponse = await mySportsHandler.updateRoster(season);

        console.log(dbResponse)

        res.status(200).send(dbResponse)
    });

    app.get(`/api/avaliableplayers`, async (req, res) => {
        const working = await mySportsHandler.availablePlayers();
        res.status(200).send(working);
    })
}