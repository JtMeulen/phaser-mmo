const players = {};
const enemies = {};

const overlaps = {};

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
  this.strikezones = this.physics.add.group();
  this.enemies = this.physics.add.group();

  this.physics.add.collider(this.players, this.players);
  this.physics.add.overlap(this.strikezones, this.enemies, meetingEnemy);
  this.physics.add.collider(this.enemies, this.players);
  this.physics.add.collider(this.enemies, this.enemies);

  // CREATE ENEMIES ON SERVER START
  for(let i = 0; i < 10 ;i++) {
    const x = Phaser.Math.Between(300, 800);
    const y = Phaser.Math.Between(300, 800);
    const id = Phaser.Math.Between(1, 999999);
    addEnemy(self, x, y, id);
    enemies[id] = {
      x: x,
      y: y,
      id: id,
      moving: false
    }
  }

  // move enemies
  this.timedEvent = this.time.addEvent({
    delay: 600,
    callback: moveEnemies,
    callbackScope: this,
    loop: true
  });

  io.on('connection', function (socket) {
    console.log('a user connected with socket ID: ', socket.id);

    const alreadyActiveUsers = {...players};
    // create a new player and add it to our players object
    socket.on('setUserStartData', function(data) {
      players[socket.id] = {
        username: data.username,
        x: data.data.x,
        y: data.data.y,
        characterType: data.data.characterType,
        playerId: socket.id,
        userId: data._id,
        moving: false,
        input: {
          left: false,
          right: false,
          up: false,
          down: false
        }
      };

      // Logout the already playing user if logged in second time
      for (var playerId in alreadyActiveUsers) {
        // found user already with this character playing
        if(alreadyActiveUsers[playerId].userId === data._id) {
          console.log('already active: ', alreadyActiveUsers[playerId]);
          io.to(alreadyActiveUsers[playerId].playerId).emit('logoutDuplicate');
        }
      }

      // add player to server
      addPlayer(self, players[socket.id]);
      // send the players object to the new player
      socket.emit('currentPlayers', players);
      socket.emit('currentEnemies', enemies);
      // update all other players of the new player
      socket.broadcast.emit('newPlayer', players[socket.id]);
    });

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
  this.physics.add.collider(this.enemies, bottomLayer);
  this.physics.add.collider(this.enemies, topLayer);
  bottomLayer.setCollisionByProperty({collides: true});
  topLayer.setCollisionByProperty({collides: true});
}

function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;

    if (input.left && !player.body.touching.left) {
      players[player.playerId].moving = 'left';
      player.facing = 'left'
      player.setVelocityX(-100);
    };

    if (input.right && !player.body.touching.right) {
      players[player.playerId].moving = 'right';
      player.facing = 'right'
      player.setVelocityX(100);
    };

    if (input.down && !player.body.touching.down) {
      players[player.playerId].moving = 'down';
      player.facing = 'down'
      player.setVelocityY(100);
    };

    if (input.up && !player.body.touching.up) {
      players[player.playerId].moving = 'up';
      player.facing = 'up'
      player.setVelocityY(-100);
    };

    if (!input.left && !input.right && !input.down && !input.up) {
      player.setVelocity(0, 0);
      players[player.playerId].moving = false;
    }

    this.strikezones.getChildren().forEach((zone) => {
      if(!zone.body.embedded) {
        while (overlaps[zone.id].length) {
          overlaps[zone.id].pop();
        }
      };
      if(zone.id === player.playerId) {
        zone.setX(player.x);
        zone.setY(player.y);
      };
    });

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });

  // update enemy positions
  this.enemies.getChildren().forEach((enemy) => {

    if(!enemy.body.touching.none) {
      enemy.setVelocity(0,0);
    }

    enemies[enemy.id].x = enemy.x;
    enemies[enemy.id].y = enemy.y;
  });

  io.emit('playerUpdates', players);
  io.emit('enemiesUpdates', enemies);
}

function moveEnemies () {
  this.enemies.getChildren().forEach((enemy) => {
    const randNumber = Math.floor((Math.random() * 20) + 1);

    switch(randNumber) {
      case 1:
        enemy.setVelocityX(100);
        enemies[enemy.id].moving = 'right';
        break;
      case 2:
        enemy.setVelocityX(-100);
        enemies[enemy.id].moving = 'left';
        break;
      case 3:
        enemy.setVelocityY(100);
        enemies[enemy.id].moving = 'down';
        break;
      case 4:
        enemy.setVelocityY(-100);
        enemies[enemy.id].moving = 'up';
        break;
      default:
        enemies[enemy.id].moving = false;
        null;
    }
  });

  setTimeout(() => {
    console.log(overlaps)
    this.enemies.setVelocityX(0);
    this.enemies.setVelocityY(0);
  }, 500);
}

function meetingEnemy(player, enemy) {
  if(overlaps[player.id].indexOf(enemy.id) === -1) {
    overlaps[player.id].push(enemy.id);
  }
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

  const strikezone = self.physics.add.sprite(playerInfo.x, playerInfo.y)
  .setOrigin(0.5, 0.5).setDisplaySize(100, 100);

  player.playerId = playerInfo.playerId;
  player.setBounce(0);
  player.setCollideWorldBounds(true);

  strikezone.id = playerInfo.playerId;
  self.players.add(player);
  self.strikezones.add(strikezone);
  overlaps[playerInfo.playerId] = [];
}

function addEnemy(self, x, y, id) {
  const enemy = self.physics.add.sprite(x, y, 'character_1')
  .setOrigin(0.5, 0.5).setDisplaySize(30, 45);
  enemy.id = id;
  enemy.setBounce(0);
  enemy.setCollideWorldBounds(true);
  self.enemies.add(enemy);
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
