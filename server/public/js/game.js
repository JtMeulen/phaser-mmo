var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
}

function create() {
  const self = this;
  this.socket = io();
  this.players = this.add.group();

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        displayPlayers(self, players[id], 'ship');
      } else {
        displayPlayers(self, players[id], 'otherPlayer');
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    displayPlayers(self, playerInfo, 'otherPlayer');
  });

  this.socket.on('disconnect', function (playerId) {
    self.players.getChildren().forEach(function (player) {
      if (playerId === player.playerId) {
        player.destroy();
      }
    });
  });

  this.socket.on('playerUpdates', function (players) {
    Object.keys(players).forEach(function (id) {
      self.players.getChildren().forEach(function (player) {
        if (players[id].playerId === player.playerId) {
          player.setPosition(players[id].x, players[id].y);
        }
      });
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.downKeyPressed = false;
  this.upKeyPressed = false;
}

function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const down = this.downKeyPressed;
  const up = this.upKeyPressed;

  this.cursors.left.isDown ?  this.leftKeyPressed = true : this.leftKeyPressed = false;
  this.cursors.right.isDown ?  this.rightKeyPressed = true : this.rightKeyPressed = false;
  this.cursors.down.isDown ?  this.downKeyPressed = true : this.downKeyPressed = false;
  this.cursors.up.isDown ?  this.upKeyPressed = true : this.upKeyPressed = false;

  if (left !== this.leftKeyPressed || right !== this.rightKeyPressed || up !== this.upKeyPressed || down !== this.downKeyPressed) {
    this.socket.emit('playerInput', { left: this.leftKeyPressed , right: this.rightKeyPressed, up: this.upKeyPressed, down: this.downKeyPressed });
  }
}

function displayPlayers(self, playerInfo, sprite) {
  const player = self.add.sprite(playerInfo.x, playerInfo.y, sprite).setOrigin(0.5, 0.5).setDisplaySize(53, 40);

  player.playerId = playerInfo.playerId;
  self.players.add(player);
}
