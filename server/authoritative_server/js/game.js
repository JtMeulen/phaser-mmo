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
  this.load.spritesheet('character_1', 'assets/character_1.png', {
    frameWidth: 64, frameHeight: 64
  });

  this.load.image('terrain', 'assets/maps/terrain_atlas.png');
  this.load.tilemapTiledJSON('world_map', 'assets/maps/world_map.json');
}

function create() {
  const self = this;
  this.players = this.physics.add.group();
  this.physics.add.collider(this.players, this.players);

  io.on('connection', function (socket) {
    console.log('a user connected with socket ID: ', socket.id);
    // create a new player and add it to our players object
    players[socket.id] = {
      x: 300,
      y: 300,
      characterType: Math.floor(Math.random() * 3) + 1, // TODO: get from database
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

  const world_map = this.add.tilemap('world_map');
  const terrain = world_map.addTilesetImage('terrain_atlas', 'terrain');

  const bottomLayer = world_map.createStaticLayer('bottom', [terrain], 0, 0).setDepth(-1);
  const topLayer = world_map.createStaticLayer('top', [terrain], 0, 0);
  this.physics.add.collider(this.players, bottomLayer);
  this.physics.add.collider(this.players, topLayer);
  bottomLayer.setCollisionByProperty({collides: true});
  topLayer.setCollisionByProperty({collides: true});
}

function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;

    if (input.left && !player.body.touching.left) {
      players[player.playerId].moving = 'left';
      player.setVelocityX(-100);
    };

    if (input.right && !player.body.touching.right) {
      players[player.playerId].moving = 'right';
      player.setVelocityX(100);
    };

    if (input.down && !player.body.touching.down) {
      players[player.playerId].moving = 'down';
      player.setVelocityY(100);
    };

    if (input.up && !player.body.touching.up) {
      players[player.playerId].moving = 'up';
      player.setVelocityY(-100);
    };

    if (!input.left && !input.right && !input.down && !input.up) {
      player.setVelocity(0, 0);
      players[player.playerId].moving = false;
    }

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });

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
  const player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'character_1')
  .setOrigin(0.5, 0.5).setDisplaySize(30, 45);
  player.playerId = playerInfo.playerId;
  player.setBounce(0);
  player.setCollideWorldBounds(true);
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
