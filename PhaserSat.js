var PhaserSat = (function (Phaser, SAT) {
	
	/**
	 * Instantiate a new PhaserSat Phaser state.
	 * 
	 * @constructor
	 */
	var PhaserSat = function () {
		// We don't need anything in the constructor for this Phaser state.
	};
	
	PhaserSat.prototype = {
		
		/**
		 * Some data populated by the update() method for use in the render()
		 * method.
		 * 
		 * @type {object<array>}
		 */
		debug: {
			vectors: [],
			normals: []
		},
		
		/**
		 * Some feature values we can use throughout our game state.
		 * 
		 * @type {object}
		 */
		features: {
			debug: 0,
			speed: 1000,
			bounce: 0,
			gravity: 500,
			friction: 0,
			slowMotion: 1
		},
		
		/**
		 * Preload any data needed for the game state.
		 * 
		 * @method PhaserSat#preload
		 */
		preload: function () {
			// Nothing to load here! We're just using geometry.
		},
		
		/**
		 * Prepare the game state.
		 *
		 * Here we create everything we want to mess around with in our update
		 * loop.
		 * 
		 * @method PhaserSat#create
		 */
		create: function () {
			// Shortcuts for some SAT classes
			var Box = SAT.Box;
			var P = SAT.Polygon;
			var V = SAT.Vector;
			
			// Enabled Phaser's advance timing and set the slow motion value
			this.time.advancedTiming = true;
			this.time.slowMotion = this.features.slowMotion;
			
			// Boot the arcade physics engine
			this.physics.startSystem(Phaser.Physics.Arcade);
			
			// Set a random, pale background colour
			this.stage.backgroundColor = Phaser.Color.getRandomColor(210, 255);
			
			// Create a graphics object to represent our player, in this case
			// a rectangle
			var playerGraphics = new Phaser.Graphics(this)
				.beginFill(Phaser.Color.getRandomColor(50, 200))
				.drawRect(0, 0, 48, 96);
			
			var playerGraphicsTexture = playerGraphics.generateTexture();
			
			// Add a new sprite to the game world, using the graphics above
			this.player = this.add.sprite(200, 200, playerGraphicsTexture);
			
			// Give it an Arcade physics body that we can use
			this.physics.arcade.enable(this.player);
			
			// Make sure the player can't leave the bounds of the game world
			this.player.body.collideWorldBounds = true;
			
			// Limit the effects of gravity and acceleration
			this.player.body.drag.x = this.features.speed;
			this.player.body.maxVelocity.x = this.features.speed;
			this.player.body.maxVelocity.y = this.features.speed;
			
			// Define the player's SAT box
			var playerBox = new Box(
				new V(this.player.body.x, this.player.body.y),
				this.player.body.width,
				this.player.body.height
			);
			
			// Conveniently add it to the player body and convert it to a
			// polygon while we're at it
			this.player.body.sat = {
				polygon: playerBox.toPolygon()
			};
			
			// Give our game state access to the desired control keys
			this.controls = game.input.keyboard.addKeys({
				'up': Phaser.KeyCode.W,
				'down': Phaser.KeyCode.S,
				'left': Phaser.KeyCode.A,
				'right': Phaser.KeyCode.D,
				'bounce': Phaser.KeyCode.B,
				'gravity': Phaser.KeyCode.G,
				'sliding': Phaser.KeyCode.C,
				'friction': Phaser.KeyCode.F,
			});
			
			// Define a bunch of SAT polygons to render and collide against
			this.polygons = [];
			
			// Let's create a wide box to act as a floor
			this.polygons.push(new Box(new V(0, 550), 800, 50).toPolygon());
			
			// A few bottom left triangles
			for (var i = 0; i < 5; i++) {
				this.polygons.push(new P(new V(200 - 32 * i, 296 - 32 * i), [
					new V(0, 0), new V(32, 32), new V(0, 32)
				]));
			}
			
			// And a few bottom right triangles
			for (i = 0; i < 5; i++) {
				this.polygons.push(new P(new V(300 + 32 * i, 296 - 32 * i), [
					new V(32, 0), new V(32, 32), new V(0, 32)
				]));
			}
			
			// A less ordinary triangle
			this.polygons.push(new P(new V(400, 300), [
				new V(46, 0), new V(0, 25), new V(64, 32)
			]));
			
			// A bigger less ordinary triangle
			this.polygons.push(new P(new V(260, 440), [
				new V(0, 0), new V(40, 40), new V(-30, 60)
			]));
			
			// Parallelogram
			this.polygons.push(new P(new V(350, 400), [
				new V(30,70), new V(60,70), new V(45,100), new V(15,100)
			]));
			
			// A big hexagon!
			this.polygons.push(new P(new V(500, 300), [
				new V(50, 0), new V(150, 0), new V(200, 75), new V(150, 150),
				new V(50, 150), new V(0, 75)
			]));
			
			// Render the polygons so that we can see them!
			for (i in this.polygons) {
				var polygon = this.polygons[i];
				
				var graphics = game.add.graphics(polygon.pos.x, polygon.pos.y);
				graphics.beginFill(Phaser.Color.getRandomColor(100, 200));
				graphics.drawPolygon(polygon.points);
				graphics.endFill();
			}
			
			// Ew just no
			this.game.debug.renderShadow = false;
		},
		
		/**
		 * Update the game state.
		 * 
		 * @method PhaserSat#update
		 */
		update: function () {
			// Create a local variable as a shortcut for our player body
			var body = this.player.body;
			
			// And the Arcade Physics gravity setting
			var gravity = this.physics.arcade.gravity;
			
			// And our keyboard controls
			var controls = this.controls;
			
			/**                                                       **\
			 * ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ *
			 * First, let's perform some collision detection with SAT! *
			 * ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ *
			\*                                                         */
			
			// Update the player box position
			body.sat.polygon.pos.x = body.x; // SAT allows us to set polygon
			body.sat.polygon.pos.y = body.y; // position properties directly
			
			// Lazily loop over all the polygons. In reality you'd use a quad
			// tree or some broad phase of collision detection so that you
			// don't have to test against everything, but we don't need
			// to get into optimisation here as this is just a test.
			for (var i in this.polygons) {
				var polygon = this.polygons[i];
				
				var response = new SAT.Response();
				var collision = SAT.testPolygonPolygon(body.sat.polygon, polygon, response);
				
				// Our collision test responded positive, so let's resolve it
				if (collision) {
					// Here's our overlap vector - let's invert it so it faces
					// out of the collision surface
					var overlapV = response.overlapV.clone().scale(-1);
					
					// Then add it to the player's position to resolve the
					// collision!
					body.position.x += overlapV.x;
					body.position.y += overlapV.y;
					
					// Let's update the SAT polygon too for any further polygons
					body.sat.polygon.pos.x = body.position.x;
					body.sat.polygon.pos.y = body.position.y;
					
					/**
					 * And now, let's experiment with - goodness me - velocity!
					 */
					
					var velocity = new SAT.V(body.velocity.x, body.velocity.y);
					
					// We need to flip our overlap normal, SAT gives it to us
					// facing inwards to the collision and we need it facing out
					var overlapN = response.overlapN.clone().scale(-1);
					
					// Project our velocity onto the overlap normal
					var velocityN = velocity.clone().projectN(overlapN);
					
					// Then work out the surface velocity
					var velocityT = velocity.clone().sub(velocityN);
					
					// Scale our normal velocity with a bounce coefficient (ziggity biggity hi! https://youtu.be/ViPQ-RIPmKk)
					var bounce = velocityN.clone().scale(-this.features.bounce);
					
					// And scale a friction coefficient to the surface velocity
					var friction = velocityT.clone().scale(1.01 - this.features.friction);
					
					// And finally add them together for our new velocity!
					var newVelocity = friction.clone().add(bounce);
					
					// Set the new velocity on our physics body
					body.velocity.x = newVelocity.x;
					body.velocity.y = newVelocity.y;
					
					// If debugging is enabled, let's print some information
					if (this.features.debug) {
						velocity.name    = 'velocity';
						overlapV.name    = 'overlapV';
						overlapN.name    = 'overlapN';
						velocityN.name   = 'velocityN';
						velocityT.name   = 'velocityT';
						bounce.name      = 'bounce';
						friction.name    = 'friction';
						newVelocity.name = 'newVelocity';
						
						this.debug.vectors.push(
							velocity, overlapN, velocityN, velocityT,
							bounce, friction, newVelocity
						);
						
						// If detailed debugging is enabled, let's print the
						// vectors as lines on the screen!
						if (this.features.debug > 1) {
							overlapN.colour = '#333';
							bounce.colour   = '#25f';
							friction.colour = '#f55';
							newVelocity.colour = '#5f5';
							
							this.debug.normals.push(
								overlapN, bounce, friction, newVelocity
							);
						}
					}
				}
			}
			
			/**
			 * Now that the physics is out of the way, we can apply velocity
			 * to our player by using acceleration.
			 */
			
			 // Let's apply some feature values
 			gravity.y = this.features.gravity;
			body.drag.x = this.features.speed;
			body.bounce.setTo(this.features.bounce);
			body.maxVelocity.x = this.features.speed;
			body.maxVelocity.y = this.features.speed;
			this.time.slowMotion = this.features.slowMotion;
			
			if (!gravity.y) {
				// We want drag on the Y axis when gravity is on
				body.drag.y = this.features.speed;
			} else {
				// But we don't want it when gravity is off!
				body.drag.y = 0;
			}
			
			// Reset the player body's acceleration
			if (!(controls.left.isDown || controls.right.isDown)) {
				body.acceleration.x = 0;
			}
			
			if (!(controls.up.isDown || controls.down.isDown)) {
				body.acceleration.y = 0;
			}
			
			// Modify the player body's acceleration or velocity based on the
			// currently pressed keys and speed value
			if (controls.up.isDown) {
				body.acceleration.y = -this.features.speed;
			}
			
			if (controls.down.isDown) {
				body.acceleration.y = this.features.speed;
			}
			
			if (controls.left.isDown) {
				body.acceleration.x = -this.features.speed;
			}
			
			if (controls.right.isDown) {
				body.acceleration.x = this.features.speed;
			}
		},
		
		render: function() {
			// Render the current framerate
			this.game.debug.text(this.time.fps || '--', 4, 16, '#777');
			
			// Bail out here if debugging is disabled
			if (this.features.debug < 1) {
				return;
			}
			
			// Render information about the player body
			this.game.debug.bodyInfo(this.player, 32, 32, '#777');
			
			// Prepare to render some text lines
			this.game.debug.start(32, 400, '#777');
			this.game.debug.columnWidth = 100;
			
			// Initialise some variables to use in some loops because my new
			// linter lints really hard
			var i, item, name, line, colour;
			
			// Render information about our vectors
			for (i in this.debug.vectors) {
				item = this.debug.vectors[i];
				name = item.hasOwnProperty('name') ? item.name : 'Vector ' + i;
				
				this.game.debug.line(name, ' x: ' + item.x.toFixed(4), ' y: ' + item.y.toFixed(4));
			}
			
			this.game.debug.stop();
			
			// Render some of the vectors themselves from the center of the
			// game world (technically the center of the screen relative to
			// their game world coordinates but whatever)
			if (this.features.debug > 1) {
				for (i in this.debug.normals) {
					item = this.debug.normals[i];
					
					// Draw the vector (why did I call this normals? because
					// vectors is already taken)
					line = new Phaser.Line(
						this.world.width / 2,
						this.world.height / 2,
						this.world.width / 2 + item.x,
						this.world.height / 2 + item.y
					);
					
					// Select a colour from the vector or fall back to pink
					colour = item.hasOwnProperty('colour') ? item.colour : 'rgba(255,128,255,0.8)';
					
					this.game.debug.geom(line, colour);
				}
			}
			
			// Clear the array for the next iteration
			this.debug.vectors = [];
			this.debug.normals = [];
		}
	};
	
	/**
	 * Keep a reference to the original renderBodyInfo() method before
	 * overriding it.
	 * 
	 * @type {function}
	 */
	Phaser.Physics.Arcade.Body.originalRenderBodyInfo = Phaser.Physics.Arcade.Body.renderBodyInfo;
	
	/**
	 * Adds a another line to Arcade Body's static renderBodyInfo() method,
	 * just so we can see a little more (i.e. drag).
	 *
	 * @static
	 * @method Phaser.Physics.Arcade.Body.renderBodyInfo
	 * @param  {Phaser.Debug}               debug
	 * @param  {Phaser.Physics.Arcade.Body} body
	 */
	Phaser.Physics.Arcade.Body.renderBodyInfo = function (debug, body) {
		Phaser.Physics.Arcade.Body.originalRenderBodyInfo.apply(this, arguments);
		debug.line('drag x: ' + body.drag.x, 'y: ' + body.drag.y);
	};
	
	return PhaserSat;
})(Phaser, SAT);
