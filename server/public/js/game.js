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

const TOTAL_CHAR_TYPES = 3

function preload() {
  for(let i = 1; i <= TOTAL_CHAR_TYPES; i++) {
    this.load.spritesheet(`character_${i}`, `assets/characters/character_${i}.png`, {
      frameWidth: 64, frameHeight: 64
    });
  };

  this.load.image('loading_image', 'assets/shield_sword.png');
  this.load.image('terrain', 'assets/maps/terrain_atlas.png');
  this.load.tilemapTiledJSON('world_map', 'assets/maps/world_map.json');
}

function create() {
  const self = this;
  this.socket = io();
  this.players = this.add.group();

  this.loadingImage = this.add.image(400, 300, 'loading_image').setDepth(3);

  // TODO TRIGGER SAVE ON EVENT
  // NOW WE SAVE DATA ON CLICK
  this.saveimage = this.add.image(100, 100, 'character_1').setInteractive().on('pointerdown', () => {
    $.ajax({
      type: 'PUT',
      url: '/updateUserSavedData',
      data: {
        x: 500,
        y: 450
      },
      // success: function(data) {
      //   console.log('UPDATED PLAYER DATA');
      // },
      error: function(err) {
        console.error(err);
      }
    });
  } );


  this.cameras.main.setSize(800, 600);
  // self.cameras.setBounds(0,0,800, 600);

  $.ajax({
    type: 'GET',
    url: '/getUserSavedData',
    success: function(data) {
      self.loadingImage.destroy();
      self.socket.emit('setUserStartData', data);
    },
    error: function(err) {
      console.error(err);
    }
  });

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      const actingPlayer = players[id].playerId === self.socket.id;

      displayPlayers(self, players[id], actingPlayer);
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    displayPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function (playerId) {
    self.players.getChildren().forEach(function (player) {
      if (playerId === player.playerId) {
        player.username.destroy();
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
          player.username.setPosition(players[id].x, players[id].y).setDepth(3);
          player.setPosition(players[id].x, players[id].y);
        }
      });
    });
  });

  createAnimations(self);

  const world_map = this.add.tilemap('world_map');
  const terrain = world_map.addTilesetImage('terrain_atlas', 'terrain');

  const bottomLayer = world_map.createStaticLayer('bottom', [terrain], 0, 0).setDepth(-1);
  const topLayer = world_map.createStaticLayer('top', [terrain], 0, 0).setDepth(2);

  topLayer.setCollisionByProperty({collides: true});

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

function displayPlayers(self, playerInfo, actingPlayer) {
  const player = self.add.sprite(playerInfo.x, playerInfo.y, `character_${playerInfo.characterType}`)
  player.setOrigin(0.5, 0.5).setDisplaySize(64, 64);

  player.playerId = playerInfo.playerId;

  player.username = self.add.text(playerInfo.x, playerInfo.y, playerInfo.username);
  player.username.setOrigin(0.5, 2.5);

  if (actingPlayer) {
    player.username.setScale(0);
    self.cameras.main.startFollow(player);
  }

  self.players.add(player);
}

function createAnimations(self) {
  for(let i = 1; i <= TOTAL_CHAR_TYPES; i++) {
    self.anims.create({
      key: `${i}_up`,
      frames: self.anims.generateFrameNumbers(`character_${i}`, {
        start: 0, end: 8
      }),
      frameRate: 10,
      repeat: -1
    });

    self.anims.create({
      key: `${i}_left`,
      frames: self.anims.generateFrameNumbers(`character_${i}`, {
        start: 9, end: 17
      }),
      frameRate: 10,
      repeat: -1
    });

    self.anims.create({
      key: `${i}_down`,
      frames: self.anims.generateFrameNumbers(`character_${i}`, {
        start: 18, end: 26
      }),
      frameRate: 10,
      repeat: -1
    });

    self.anims.create({
      key: `${i}_right`,
      frames: self.anims.generateFrameNumbers(`character_${i}`, {
        start: 27, end: 35
      }),
      frameRate: 10,
      repeat: -1
    });
  };
}
