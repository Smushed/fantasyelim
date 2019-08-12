import React, { Component } from 'react';
import { withAuthorization } from '../Session';
import axios from 'axios';
import { Button, Row, Col } from 'reactstrap';
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const Alert = withReactContent(Swal);

class PlayerEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    loading() {
        Alert.fire({
            title: 'Loading',
            text: 'Working your request',
            imageUrl: 'https://media.giphy.com/media/3o7aDczpCChShEG27S/giphy.gif',
            imageWidth: 200,
            imageHeight: 200,
            imageAlt: 'Loading Football',
            showConfirmButton: false,
            showCancelButton: false
        });
    };
    doneLoading() {
        Alert.close()
    };

    updateNFLRoster = () => {
        this.loading();
        axios.get(`/api/updateTeams`).then(response => {
            this.doneLoading();
            console.log(response.data);
        });

    };

    getMassData = () => {
        Alert.fire({
            type: `warning`,
            title: `Are you sure?`,
            text: `It will take a LONG time`,
            showCancelButton: true,
        }).then(async result => {
            if (result.value) {
                Alert.fire(`Success`, `This will be a while. Go play some games?`, `success`);
                this.loading(); // This successfully updates the database but doneLoading doesn't work
                const response = await axios.get(`/api/massplayerupdate`);
                this.doneLoading();
                console.log(response);
            };
        });
    };

    getWeeklyData = async () => {
        this.loading()
        try {
            const dbResponse = await axios.get(`/api/updatePlayers/${this.props.season}/${this.props.week}`)
            console.log(dbResponse)
            this.doneLoading();
        } catch (err) {
            console.log(err)
        }

    };

    render() {
        return (
            <Row>
                <Col>
                    <Button color='warning' onClick={this.getMassData}>
                        Mass Update All Players
                    </Button>
                    <br />
                    <br />
                    <Button color='secondary' onClick={this.updateNFLRoster}>
                        Update NFL Roster
                    </Button>
                    <br />
                    <br />
                    <Button color='secondary' onClick={this.getWeeklyData}>
                        Update Get Weekly Data
                    </Button>
                </Col>
            </Row>
        )
    }


};

const condition = authUser => !!authUser;

export default withAuthorization(condition)(PlayerEditor);