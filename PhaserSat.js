var PhaserSat = (function (Phaser, SAT) {
	
	/**
	 * @constructor
	 */
	var PhaserSat = function () {
		// We don't need to put anything here, private variables/methods are
		// a rarity for Phaser states (as far as I've seen...)!
	};
	
	// Shortcuts for some SAT classes, the same as demonstrated in its readme
	var Box = SAT.Box;
	var P = SAT.Polygon;
	var V = SAT.Vector;
	
	PhaserSat.prototype = {
		
		preload: function () {
			this.time.advancedTiming = true;
		},
		
		create: function () {
			// Boot the arcade physics engine
			this.physics.startSystem(Phaser.Physics.Arcade);
			
			// Set its gravity
			this.physics.arcade.gravity.y = 1000;
			
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
			
			// And limit its Y velocity to limit the effects of gravity
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
				'gravity': Phaser.KeyCode.G
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
				
			]))
			
			// Render the polygons so that we can see them!
			for (var i in this.polygons) {
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
			
			// Reset its X velocity
			body.velocity.x = 0;
			
			// Reset its Y velocity if there's no gravity
			if (!this.physics.arcade.gravity.y) {
				body.velocity.y = 0;
			}
			
			// Modify its velocity based on the keys currently pressed
			if (this.controls.up.isDown) {
				body.velocity.y = -200;
			}
			
			if (this.controls.down.isDown) {
				body.velocity.y = 200;
			}
			
			if (this.controls.left.isDown) {
				body.velocity.x = -200;
			}
			
			if (this.controls.right.isDown) {
				body.velocity.x = 200;
			}
			
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
					var overlap = response.overlapV;
					
					// We can subtract it from the player's position to resolve
					// the collision!
					body.position.x -= overlap.x;
					body.position.y -= overlap.y;
					
					// Let's update the SAT polygon too for any further polygons
					body.sat.polygon.pos.x -= overlap.x;
					body.sat.polygon.pos.y -= overlap.y;
				}
			}
		},
		
		render: function() {
			// Render the current framerate
			this.game.debug.text(this.time.fps || '--', 4, 16, '#777');
		}
	}
	
	return PhaserSat;
})(Phaser, SAT);
