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

const game = new Phaser.Game(config);

const TOTAL_CHAR_TYPES = 2

function preload() {
  for(let i = 1; i <= TOTAL_CHAR_TYPES; i++) {
    console.log(i);
    this.load.spritesheet(`character_${i}`, `assets/characters/character_${i}.png`, {
      frameWidth: 64, frameHeight: 64
    });
  };
}

function create() {
  const self = this;
  this.socket = io();
  this.players = this.add.group();

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
        displayPlayers(self, players[id]);
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    displayPlayers(self, playerInfo);
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

          if(players[id].moving) {
            player.anims.play(`${players[id].characterType}_${players[id].moving}`, true);
          } else {
            player.anims.stop(null)
          }

          player.setPosition(players[id].x, players[id].y);
        }
      });
    });
  });

  createAnimations(self);

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

function displayPlayers(self, playerInfo) {
  const player = self.add.sprite(playerInfo.x, playerInfo.y, `character_${playerInfo.characterType}`)
  player.setOrigin(0.5, 0.5).setDisplaySize(64, 64);

  player.playerId = playerInfo.playerId;
  self.players.add(player);
}

function createAnimations(self) {
  self.anims.create({
    key: '1_up',
    frames: self.anims.generateFrameNumbers('character_1', {
      start: 0, end: 8
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '1_left',
    frames: self.anims.generateFrameNumbers('character_1', {
      start: 9, end: 17
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '1_down',
    frames: self.anims.generateFrameNumbers('character_1', {
      start: 18, end: 26
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '1_right',
    frames: self.anims.generateFrameNumbers('character_1', {
      start: 27, end: 35
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '2_up',
    frames: self.anims.generateFrameNumbers('character_2', {
      start: 0, end: 8
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '2_left',
    frames: self.anims.generateFrameNumbers('character_2', {
      start: 9, end: 17
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '2_down',
    frames: self.anims.generateFrameNumbers('character_2', {
      start: 18, end: 26
    }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: '2_right',
    frames: self.anims.generateFrameNumbers('character_2', {
      start: 27, end: 35
    }),
    frameRate: 10,
    repeat: -1
  });
}
