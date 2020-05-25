exports.connection = function (ws) {
    ws.ipAddress = ws._socket.remoteAddress.replace(/^.*:/g, '');
    ws.port = ws._socket.remotePort;
    ws.unique = Math.floor(Math.random() * 10000).toString(16).substring(2);

    while (true) {
        id = Math.floor(Math.random() * 10000).toString();
        if (ids.indexOf(id) < 0) {
            break;
        }
    }

    ws.id = id;

    console.log('Connect new client:%s', ws.id);

};

exports.disconnect = function (ws, code, reason, s) {
    console.log('disconnect : ' + ws.id);
    console.log(reason);

    response = { command: '', roomNumber: '', message: '', id: ''};

    idIndex = ids.indexOf(ws.id);

    if (idIndex >= 0) {
        ids.splice(idIndex, idIndex);
    }

    if (idRoomTable[ws.id]) {
        roomNumber = idRoomTable[ws.id];

        response.command = 'MemberLeft';
        response.roomNumber = roomNumber;
        response.message = idNameTable[ws.id];
        response.id = ws.id;

        str = JSON.stringify(response);


        if (rooms[roomNumber]) {
            s.clients.forEach(client => {
                if (rooms[roomNumber].indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });


            indexInRoom = rooms[roomNumber].indexOf(ws.id);
            if (indexInRoom >= 0) {
                rooms[roomNumber].splice(indexInRoom, indexInRoom);
            }
        }


        if (idNameTable[ws.id]) {
            delete idNameTable[ws.id];
        }

        delete idRoomTable[ws.id];
    }

    if (rooms[ws.id]) {
        response.command = 'MasterLeft';
        response.roomNumber = ws.id;
        response.message = '';
        response.id = ws.id;

        str = JSON.stringify(response);

        s.clients.forEach(client => {
            if (rooms[ws.id].indexOf(client.id) >= 0 && client != ws) {
                console.log("send to " + client.id);
                client.send(str);
            }
        });

        delete rooms[ws.id];
    }

    if (roomConditionTable[ws.id]) {
        delete roomConditionTable[ws.id];
    }

    if (roomAnswerIDBuffer[ws.id]) {
        delete roomAnswerIDBuffer[ws.id];
    }

    console.log(rooms);
    console.log(idNameTable);
    console.log(idRoomTable);
};

ids = [];
rooms = {};
idNameTable = {};
idRoomTable = {};
roomConditionTable = {};
roomAnswerIDBuffer = {};
maxMemberCount = 5;

exports.message = function (message, ws, s) {

    response = { command: '', roomNumber: '', message: '' , id: ''};
    var json = JSON.parse(message)

    console.log(json);

    console.log(rooms);

    if (json.command == 'CreateRoom') {

        roomNumber = ws.id;

        console.log('Create room id:' + ws.id);

        //id of room creator(ws) is room id
        rooms[roomNumber] = [ws.id];
        idRoomTable[ws.id] = roomNumber;
        roomConditionTable[ws.id] = 'Waiting';
        roomAnswerIDBuffer[ws.id] = { questionID: '', answererID: '', answerTime: -1 };

        // send room id
        response.command = 'CreateRoom';
        response.message = maxMemberCount.toString();
        response.roomNumber = roomNumber;
        response.id = ws.id;

        ws.send(JSON.stringify(response));

    } else if (json.command == 'JoinRoom') {
        console.log("roomNumber: " + json.roomNumber);
        room = rooms[json.roomNumber];
        if (room) {
            if (roomConditionTable[json.roomNumber] && roomConditionTable[json.roomNumber] != 'Waiting') {

                response.command = "Playing";
                response.roomNumber = json.roomNumber;
                response.message = "";
                response.id = ws.id;

                ws.send(JSON.stringify(response));

            } else if (room.length >= maxMemberCount) {
                response.command = "RoomIsFull";
                response.roomNumber = json.roomNumber;
                response.message = "";
                response.id = ws.id;

                ws.send(JSON.stringify(response));
            } else {
                if (!idRoomTable[ws.id]) {
                    room.push(ws.id);

                    newMemberName = json.message;

                    idNameTable[ws.id] = newMemberName;
                    idRoomTable[ws.id] = json.roomNumber;

                    response.command = 'RoomJoined';
                    response.roomNumber = json.roomNumber;
                    response.message = maxMemberCount.toString();
                    response.id = ws.id;

                    ws.send(JSON.stringify(response));

                    response.command = 'NewMemberJoined';
                    response.message = newMemberName;

                    str = JSON.stringify(response);

                    s.clients.forEach(client => {
                        if (room.indexOf(client.id) >= 0 && client != ws) {
                            console.log("send to " + client.id);
                            client.send(str);
                        }
                    });
                } else {
                    response.comman = 'AlreadyJoinRoom';
                    response.roomNumber = idRoomTable[ws.id];
                    response.message = '';
                    response.id = ws.id;

                    ws.send(JSON.stringify(response));
                }
            }
        } else {

            response.command = 'RoomNotFound';

            ws.send(JSON.stringify(response));
        }
    } else if (json.command == 'GetMemberNames') {
        console.log("GetMemberNames of:" + json.roomNumber + ':' + ws.id);
        room = rooms[json.roomNumber];

        if (room) {

            response.command = 'NewMemberJoined';
            response.roomNumber = json.roomNumber;

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws && idNameTable[client.id]) {
                    response.message = idNameTable[client.id];
                    response.id = client.id;
                    console.log(response);
                    ws.send(JSON.stringify(response));
                }
            });

        } else {
            response.command = 'RoomNotFound';

            ws.send(JSON.stringify(response));
        }

    } else if (json.command == 'LeaveRoom') {
        console.log("leaveRom" + json.roomNumber);
        room = rooms[json.roomNumber];

        if (idRoomTable[json.id]) {
            delete idRoomTable[json.id];
        }

        if (room) {
            index = room.indexOf(ws.id);
            if (index >= 0) {
                room.splice(index, index);
            }

            response.command = 'MemberLeft';
            response.roomNumber = json.roomNumber;
            response.message = idNameTable[ws.id];
            response.id = json.id;

            str = JSON.stringify(response);

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        }
    } else if (json.command == 'GameStart') {
        console.log("game start:" + json.roomNumber);
        room = rooms[json.roomNumber];

        if (room) {

            roomConditionTable[json.roomNumber] = 'Playing';


            response.command = 'GameStart';
            response.roomNumber = json.roomNumber;
            response.message = '';
            response.id = '';

            str = JSON.stringify(response);

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        }
    } else if (json.command == 'SendMessage') {
        console.log("send message");
        room = rooms[json.roomNumber];
        console.log("get room");
        if (room) {

            response.command = 'SendMessage';
            response.roomNumber = json.roomNumber;
            response.message = json.message;


            str = JSON.stringify(response);


            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        } else {
            response.command = 'RoomNotFound';
            response.roomNumber = json.roomNumber;

            ws.send(response);
        }
    } else if (json.command == 'DistributeQuestion') {
        console.log("distribute question");
        console.log("Question ID :" + json.id);
        console.log("Question Content:" + json.message);

        room = rooms[json.roomNumber];

        if (room) {

            roomAnswerIDBuffer[json.roomNumber] = { questionID: json.id, answererID: '', answerTime: -1 };



            response.command = 'DistributeQuestion';
            response.roomNumber = json.roomNumber;
            response.id = json.id;
            response.message = json.message;

            str = JSON.stringify(response);

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        }
    } else if (json.command == 'Answer') {
        console.log("answer");
        console.log("Answer client:" + ws.id);

        roomNumber = json.roomNumber;

        room = rooms[roomNumber];

        if (!roomAnswerIDBuffer[roomNumber] || roomAnswerIDBuffer[roomNumber].answerTime == -1) {
            setTimeout(sendAnswer, 1000, s, roomNumber);
            roomAnswerIDBuffer[roomNumber] = { questionID: json.id, answererID: ws.id, answerTime: parseFloat(json.message) };
        }

        if (room) {
            answerTime = parseFloat(json.message);
            if (roomAnswerIDBuffer[roomNumber] && roomAnswerIDBuffer[roomNumber].questionID == json.id && roomAnswerIDBuffer[roomNumber].answerTime != -1 && roomAnswerIDBuffer[roomNumber].answerTime > answerTime) {
                roomAnswerIDBuffer[roomNumber].answererID = ws.id;
                roomAnswerIDBuffer[roomNumber].answerTime = answerTime;
            }
        }
    } else if (json.command == 'WrongAnswer') {
        console.log("Wrong Answer");
        console.log("Answer client:" + json.id);
        console.log("Wrong answer message:" + json.message);

        roomNumber = json.roomNumber;

        room = rooms[roomNumber];

        if (room) {
            if (roomAnswerIDBuffer[roomNumber] && roomAnswerIDBuffer[roomNumber].questionID == json.id) {
                response.command = 'WrongAnswer';
                response.roomNumber = roomNumber;
                response.id = json.id;
                response.message = json.message;

                str = JSON.stringify(response);

                s.clients.forEach(client => {
                    if (room.indexOf(client.id) >= 0) {
                        console.log("send to " + client.id);
                        client.send(str);
                    }
                });
            }
        }

    } else if (json.command == 'Ready') {
        console.log("Ready :" + json.id);

        roomNumber = json.roomNumber;

        room = rooms[roomNumber];

        if (room) {
            response.command = 'Ready';
            response.roomNumber = roomNumber;
            response.id = ws.id;
            response.message = '';

            str = JSON.stringify(response);

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client.id == roomNumber) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        }
    } else if (json.command == 'GameFinish') {
        console.log("GameFinish : " + json.roomNumber);

        roomNumber = json.roomNumber;

        room = rooms[roomNumber];

        if (room) {
            response.command = 'GameFinish';
            response.roomNumber = roomNumber;
            response.id = '';
            response.message = '';

            str = JSON.stringify(response);

            s.clients.forEach(client => {
                if (room.indexOf(client.id) >= 0 && client != ws) {
                    console.log("send to " + client.id);
                    client.send(str);
                }
            });
        }
    } else if (json.command == 'Dummy') {

    }

        
};

function sendAnswer(s, roomNumber) {
    response = { command: '', roomNumber: '', message: '', id: '' };

    response.command = 'Answer';
    response.roomNumber = roomNumber;
    response.id = roomAnswerIDBuffer[roomNumber].answererID;
    response.message = '';

    str = JSON.stringify(response);

    console.log(response);

    s.clients.forEach(client => {
        if (rooms[roomNumber].indexOf(client.id) >= 0) {
            console.log("answer send to " + client.id);
            client.send(str);
        }
    });
}