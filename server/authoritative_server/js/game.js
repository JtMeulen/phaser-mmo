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
      characterType: Math.floor(Math.random() * 2) + 1, // TODO: get from database
      playerId: socket.id,
      moving: false,
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

    if (input.left) {
      players[player.playerId].moving = 'left';
      player.x -= 3
    };

    if (input.right) {
      players[player.playerId].moving = 'right';
      player.x += 3
    };

    if (input.down) {
      players[player.playerId].moving = 'down';
      player.y += 3
    };

    if (input.up) {
      players[player.playerId].moving = 'up';
      player.y -= 3
    };

    if (!input.left && !input.right && !input.down && !input.up) {
      players[player.playerId].moving = false;
    }

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });

  this.physics.world.wrap(this.players, 5);
  io.emit('playerUpdates', players);
}

function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      console.log('')
      players[player.playerId].input = input;
    }
  });
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(64, 64);
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
