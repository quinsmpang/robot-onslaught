"use strict";

var World = function(game) {
    this.game = game;

    this.music = null;
    this.sounds = {};

    this.foreground = null;
    this.middleground = null;
    this.background = null;

    this.spawn_locations = [];
    this.SPAWN_TILE = 10;
};

World.prototype.BLOCK = {
    w: 64,
    h: 64
};

World.prototype.preload = function() {
    this.game.stage.backgroundColor = '#1f1d2c';

    // Terrain Spritesheet
    this.game.load.spritesheet('terrain', 'images/terrain.png', this.BLOCK.w, this.BLOCK.h);

    // Background Music
    this.game.load.audio('music', 'audio/background.mp3');

    // Sound Effects
    this.game.load.audio('damage', 'audio/damage.wav');
    this.game.load.audio('death', 'audio/death.wav');
    this.game.load.audio('pickup', 'audio/pickup.wav');
    this.game.load.audio('shoot', 'audio/shoot.wav');
    this.game.load.audio('spawn', 'audio/spawn.wav');

    // Map Data
    this.game.load.tilemap('level', 'data/level_0_0.csv', null, Phaser.Tilemap.CSV);

    // Game Settings
    this.game.renderer.roundPixels = true;
    this.game.time.advancedTiming = true;
};

World.prototype.create = function() {
    this.music = game.add.audio('music', 1, true);

    this.sounds = {
        damage: this.game.add.audio('damage'),
        death: this.game.add.audio('death'),
        pickup: this.game.add.audio('pickup'),
        shoot: this.game.add.audio('shoot'),
        spawn: this.game.add.audio('spawn')
    };

    this.music.play('', 0, 0.1, true);

    this.game.physics.startSystem(Phaser.Physics.ARCADE);

    this.background = this.game.add.group();
    this.background.enableBody = false;

    this.middleground = this.game.add.group();
    this.middleground.enableBody = true;

    this.hostileground = this.game.add.group();
    this.hostileground.enableBody = true;

    this.foreground = this.game.add.group();
    this.foreground.enableBody = false;

    var realBounds = this.buildMap();

    this.middleground.setAll('body.immovable', true);

    this.game.world.setBounds(0, 0, realBounds[0] * this.BLOCK.w, realBounds[1] * this.BLOCK.h);
};

World.prototype.update = function() {
    this.game.physics.arcade.collide(player.entity, this.middleground);
    //this.game.physics.arcade.collide(pickups.entities, this.foreground);
};

World.prototype.parseRawTilesheets = function() {
    var level = this.game.cache.getTilemapData('level').data.split('\n');

    for (var y = 0; y < level.length; y++) {
        level[y] = level[y].split(',');
        for (var x = 0; x < level[y].length; x++) {
            level[y][x] = parseInt(level[y][x], 10);
            if (level[y][x] === this.SPAWN_TILE) {
                this.spawn_locations.push({
                    x: x,
                    y: y
                });
            }
        }
    }

    return level;
};

/**
 * This is a heavy process, so optimize the heck out of it
 */
World.prototype.buildMap = function() {
    var level = this.parseRawTilesheets(),
        tile,
        w = this.BLOCK.w,
        h = this.BLOCK.h,
        tile_offset,
        hull,
        HEIGHT = level.length,
        WIDTH = level[0].length; // Ode to UT's Invisible Collision Hull

    // Never going to look at tiles adjacent to the edge.
    // This makes it a lot easier to look for neighbors
    // Also, NEVER put a floor on an edge tile
    for (var y = 1; y < HEIGHT - 1; y++) {
        for (var x = 1; x < WIDTH - 1; x++) {
            tile = level[y][x];

            if (tile === 0) {
                // Abyss
                if (level[y-1][x]) {
                    // If there is a floor north of us, and we're abyss, add a shadow
                    this.background.create(x * w, y * h, 'terrain', 16);
                }

                if (level[y-1][x] || level[y][x+1] || level[y][x-1] || level[y+1][x]) {
                    // If this abyss has a item N, E, S, W of it, then add an invisible foreground for collision
                    // We only need to look for collision in the direction it faces a walkable tile
                    hull = this.middleground.create(x * w, y * h, 'terrain', 83);
                    hull.body.checkCollision.up = !!level[y-1][x];
                    hull.body.checkCollision.right = !!level[y][x+1];
                    hull.body.checkCollision.down = !!level[y+1][x];
                    hull.body.checkCollision.left = !!level[y][x-1];
                }
            } else if (tile < 20) {
                if (tile === 1) {
                    // TODO: Lots of ugly logic :(
                    //this.background.create(x * w, y * h, 'terrain', 20);
                    tile_offset = this.tileLogic(
                        level[y-1][x],
                        level[y-1][x+1],
                        level[y][x+1],
                        level[y+1][x+1],
                        level[y+1][x],
                        level[y+1][x-1],
                        level[y][x-1],
                        level[y-1][x-1]
                    );
                    this.background.create(x * w, y * h, 'terrain', tile_offset);

                } else if (tile === 2) {
                    this.background.create(x * w, y * h, 'terrain', 4);
                } else if (tile === 10) {
                    this.background.create(x * w, y * h, 'terrain', 62);
                }
                // Floor
            } else if (tile < 40) {
                // Solid
                if (tile >= 20 && tile <= 22) {
                    // Block, Computer A, and Computer B have same tops
                    this.foreground.create(x * w, (y-1) * h, 'terrain', 30);

                    if (tile === 20) {
                        // BLOCK
                        this.middleground.create(x * w, y * h, 'terrain', 42);
                    } else if (tile === 21) {
                        // COMPUTER A
                        this.middleground.create(x * w, y * h, 'terrain', 43);
                    } else if (tile === 22) {
                        // COMPUTER B
                        this.middleground.create(x * w, y * h, 'terrain', 44);
                    }
                } else if (tile === 23) {
                    // SOLID A
                    this.foreground.create(x * w, (y-1) * h, 'terrain', 31);
                    this.middleground.create(x * w, y * h, 'terrain', 45);
                } else if (tile === 24) {
                    // SOLID B
                    this.foreground.create(x * w, (y-1) * h, 'terrain', 59);
                    this.middleground.create(x * w, y * h, 'terrain', 73);
                }
            }

        }
    }

    return [WIDTH, HEIGHT];
};

World.prototype.tileLogic = function (n, ne, e, se, s, sw, w, nw) {
    if (n && ne && e && se && s && sw && w && nw) return 20;
    if (!n && !ne && !e && !se && !s && !sw && !w && !nw) return 4;

    if (n && ne && e && se && s && sw && w && !nw) return 23;
    if (n && ne && e && se && s && !sw && w && nw) return 9;
    if (n && ne && e && !se && s && sw && w && nw) return 8;
    if (n && !ne && e && se && s && sw && w && nw) return 22;

    if (n && ne && e && se && s && !sw && w && !nw) return 37;
    if (n && ne && e && !se && s && !sw && w && nw) return 36;
    if (n && !ne && e && !se && s && sw && w && nw) return 39;
    if (n && !ne && e && se && s && sw && w && !nw) return 38;

    if (n && !e && s && !sw && w && !nw) return 13;
    if (!n && e && !se && s && !sw && w) return 12;
    if (n && !ne && e && !se && s && !w) return 26;
    if (n && !ne && e && !s && w && !nw) return 27;


    if (n && w  && !e && !s && se) return 10;
    if (n && s && !w && !e) return 18;
    if (!n && !s && w && e) return 32;
    if (n && w && e && !s) return 34;
    if (n && w && !e && s) return 21;
    if (!n && w && e && s) return 6;
    if (n && !w && e && s) return 19;

    if (!n && !e && s && w && !sw) return 11;
    if (!n && e && s && !w && !se) return 10;
    if (n && e && !s && !w && !ne) return 24;
    if (n && !e && !s && w && !nw) return 25;

    if (n && e && !s && !w) return 33;
    if (!n && e && s && !w) return 5;
    if (!n && !e && s && w) return 7;
    if (n && !e && !s && w) return 35;

    return 20; // fuck it
};