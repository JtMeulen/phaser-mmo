const players = {};

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
}

function create() {
  const self = this;
  this.players = this.physics.add.group();

  io.on('connection', function (socket) {
    console.log('a user connected with socket ID: ', socket.id);
    // create a new player and add it to our players object
    players[socket.id] = {
      x: 100,
      y: 100,
      playerId: socket.id,
      input: {
        left: false,
        right: false,
        up: false,
        down: false
      }
    };
    // add player to server
    addPlayer(self, players[socket.id]);
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
      console.log('user disconnected with socket ID: ', socket.id);
      // remove player from server
      removePlayer(self, socket.id);
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnect', socket.id);
    });

    // when a player moves, update the player data
    socket.on('playerInput', function (inputData) {
      handlePlayerInput(self, socket.id, inputData);
    });
  });

  // this.physics.add.collider(this.players, this.players, function (player) {
  //   console.log('something')
  // });
}

function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;

    input.left ? player.x -= 3 : null;
    input.right ? player.x += 3 : null;
    input.down ? player.y += 3 : null;
    input.up ? player.y -= 3 : null;

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });

  this.physics.world.wrap(this.players, 5);
  io.emit('playerUpdates', players);
}

function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}

function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

const game = new Phaser.Game(config);
window.gameLoaded();
