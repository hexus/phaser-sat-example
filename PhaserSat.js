var PhaserSat = (function (Phaser, SAT) {
	
	/**
	 * @constructor
	 */
	var PhaserSat = function () {
		// We don't need anything in our Phaser state constructor
	};
	
	PhaserSat.prototype = {
		
		/**
		 * Some debug data arrays.
		 * 
		 * @type {object<array>}
		 */
		debug: {
			vectors: [],
			normals: []
		},
		
		/**
		 * Some feature values.
		 * 
		 * @type {object}
		 */
		features: {
			debug: true,
			bounce: 0.1,
			friction: 0,
			stopSliding: false
		},
		
		preload: function () {
			this.time.advancedTiming = true;
		},
		
		create: function () {
			// Shortcuts for some SAT classes
			var Box = SAT.Box;
			var P = SAT.Polygon;
			var V = SAT.Vector;
			
			// Boot the arcade physics engine
			this.physics.startSystem(Phaser.Physics.Arcade);
			
			// Set its gravity
			this.physics.arcade.gravity.y = 500;
			
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
			this.player.body.drag.x = 1000;
			this.player.body.maxVelocity.x = 1000;
			this.player.body.maxVelocity.y = 500;
			
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
			
			// A bottom left triangle
			this.polygons.push(new P(new V(200, 296), [
				new V(0, 0), new V(32, 32), new V(0, 32)
			]));
			
			// A few bottom right triangles
			for (var i = 0; i < 3; i++) {
				this.polygons.push(new P(new V(300 + 32 * i, 296 - 32 * i), [
					new V(32, 0), new V(32, 32), new V(0, 32)
				]));
			}
			
			// A less ordinary triangle
			this.polygons.push(new P(new V(400, 300), [
				new V(46, 0), new V(0, 25), new V(64, 32)
			]));
			
			// Parallelogram
			this.polygons.push(new P(new V(400, 400), [
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
		
		update: function () {
			// Toggle gravity when we've just pressed G
			if (this.controls.gravity.justDown) {
				this.physics.arcade.gravity.y = !this.physics.arcade.gravity.y ? 1000 : 0;
			}
			
			// Create a local variable as a shortcut for our player body
			var body = this.player.body;
			
			/**
			 * And now, let's perform some collision detection with SAT!
			 */
			
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
					// Here's our overlap vector
					var overlapV = response.overlapV.clone().scale(-1);
					
					// We can subtract it from the player's position to resolve
					// the collision!
					body.position.x += overlapV.x;
					body.position.y += overlapV.y;
					
					// Let's update the SAT polygon too for any further polygons
					body.sat.polygon.pos.x += overlapV.x;
					body.sat.polygon.pos.y += overlapV.y;
					
					/**
					 * And now, let's experiment with - goodness me - velocity!
					 */
					
					var velocity = new SAT.V(body.velocity.x, body.velocity.y);
					
					// We need to flip our overlap normal, SAT gives it to us
					// facing inwards to the collision
					var overlapN = response.overlapN.clone().scale(-1);
					
					// Get the dot product of our velocity and overlap normal
					var dotProduct = velocity.dot(overlapN);
					
					// If it's less than zero we're moving into the collision
					if (dotProduct <= 0) {
						// Project our velocity onto the overlap normal
						var velocityN = velocity.clone().projectN(overlapN);
						
						// Then work out the surface velocity
						var velocityT = velocity.clone().sub(overlapN);
						
						// Here we tinker with static friction
						//var frictionCoefficient = this.features.friction;
						//if (velocityT.len < 0.01)
						//	frictionCoefficient = 0;
						
						// Scale our normal velocity with a bounce coefficient (ziggity higgity hi! https://youtu.be/ViPQ-RIPmKk)
						var bounce = velocityN.clone().scale(1 + this.features.bounce);
						
						// And scale a friction coefficient to the surface velocity
						var friction = velocityT.clone().scale(1 - this.features.friction);
						
						// And finally add them together for our new velocity!
						var newVelocity = friction.clone().add(bounce);
						
						// Set the new velocity on our physics body
						body.velocity.x = newVelocity.x;
						body.velocity.y = newVelocity.y;
						
						// If debugging is enabled, let's print the information
						if (this.features.debug) {
							this.debug.vectors = [];
							this.debug.normals = [];
							
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
							
							// TODO: Set some colours
							this.debug.normals.push(
								overlapN, bounce, friction, newVelocity
							)
						}
					}
				}
			}
			
			// Reset its X accelleration
			body.acceleration.x = 0;
			
			// Reset its Y velocity if there's no gravity
			if (!this.physics.arcade.gravity.y) {
				body.velocity.y = 0;
			}
			
			// Modify its accelleration or velocity based on the currently
			// pressed keys
			if (this.controls.up.isDown) {
				body.velocity.y = -200;
			}
			
			if (this.controls.down.isDown) {
				body.velocity.y = 200;
			}
			
			if (this.controls.left.isDown) {
				body.acceleration.x = -1000;
			}
			
			if (this.controls.right.isDown) {
				body.acceleration.x = 1000;
			}
		},
		
		render: function() {
			// Render the current framerate
			this.game.debug.text(this.time.fps || '--', 4, 16, '#777');
			
			// Bail out here if debugging is disabled
			if (!this.features.debug)
				return;
			
			// Render information about the player body
			this.game.debug.bodyInfo(this.player, 32, 32, '#777');
			
			// Prepare to render some text lines
			this.game.debug.start(32, 400, '#777');
			this.game.debug.columnWidth = 100;
			
			// Render information about our vectors
			for (var i in this.debug.vectors) {
				var item = this.debug.vectors[i];
				var name = item.hasOwnProperty('name') ? item.name : 'Vector ' + i;
				
				this.game.debug.line(name, ' x: ' + item.x.toFixed(4), ' y: ' + item.y.toFixed(4));
			}
			
			this.game.debug.stop();
			
			for (var i in this.debug.normals) {
				var item = this.debug.normals[i];
				
				// Draw the normal from the center of the world
				var line = new Phaser.Line(
					this.world.width / 2,
					this.world.height / 2,
					this.world.width / 2 + Math.min(item.x * 10, 100),
					this.world.height / 2 + Math.min(item.y * 10, 100)
				);
				
				this.game.debug.geom(line, 'rgba(255,128,255,0.8)');
			}
			
			// Clear the array for the next iteration
			// this.debug.vectors = [];
		}
	};
	
	return PhaserSat;
})(Phaser, SAT);
