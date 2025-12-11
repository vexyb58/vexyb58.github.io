window.onload = () => {

    // --- Initialization ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // --- Game Constants ---
    const PLAYER_SIZE = 30;
    const LEVEL_SPEED = 3;
    const GRAVITY = 0.5;
    const JUMP_FORCE = -10;
    const FLOOR_Y = HEIGHT - 50; // The Y position of the ground line

    // --- Player Object ---
    let player = {
        x: 50,
        y: FLOOR_Y - PLAYER_SIZE,
        y_velocity: 0,
        is_grounded: true,
        color: 'yellow'
    };

    // --- Level Objects ---
    let level_objects = [
        { x: 0, y: FLOOR_Y, width: WIDTH * 2, height: HEIGHT - FLOOR_Y, type: 'block', color: 'green' },
        { x: 400, y: FLOOR_Y - 20, width: 20, height: 20, type: 'spike', color: 'red' },
        { x: 700, y: FLOOR_Y - 20, width: 20, height: 20, type: 'spike', color: 'red' }
    ];

    // --- Core Game Loop ---
    function gameLoop() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Gravity
        if (!player.is_grounded) {
            player.y_velocity += GRAVITY;
        }
        player.y += player.y_velocity;

        // Auto-scrolling
        level_objects.forEach(obj => {
            obj.x -= LEVEL_SPEED;
        });

        // Collisions
        checkCollisions();

        // Draw everything
        drawLevel();
        drawPlayer();

        requestAnimationFrame(gameLoop);
    }

    // --- Collision Logic ---
    function checkCollisions() {
        let hit_ground = false;

        for (let obj of level_objects) {

            const overlap = (
                player.x < obj.x + obj.width &&
                player.x + PLAYER_SIZE > obj.x &&
                player.y < obj.y + obj.height &&
                player.y + PLAYER_SIZE > obj.y
            );

            if (overlap) {
                if (obj.type === 'block') {
                    if (player.y_velocity > 0 && player.y + PLAYER_SIZE <= obj.y + 5) {
                        player.y = obj.y - PLAYER_SIZE;
                        player.y_velocity = 0;
                        player.is_grounded = true;
                        hit_ground = true;
                    }
                } else if (obj.type === 'spike') {
                    restartGame();
                    return;
                }
            }
        }

        if (!hit_ground && player.y < FLOOR_Y - PLAYER_SIZE) {
            player.is_grounded = false;
        }

        if (player.y > HEIGHT) {
            restartGame();
        }
    }

    // --- Drawing ---
    function drawPlayer() {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }

    function drawLevel() {
        level_objects.forEach(obj => {
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        });
    }

    // --- Input ---
    function handleJump(event) {
        if (event.code === 'Space' || event.button === 0) {
            if (player.is_grounded) {
                player.y_velocity = JUMP_FORCE;
                player.is_grounded = false;
            }
        }
    }

    document.addEventListener('keydown', handleJump);
    document.addEventListener('mousedown', handleJump);

    // --- Restart ---
    function restartGame() {
        alert("Game Over! Try again.");

        player.y = FLOOR_Y - PLAYER_SIZE;
        player.y_velocity = 0;
        player.is_grounded = true;

        level_objects = [
            { x: 0, y: FLOOR_Y, width: WIDTH * 2, height: HEIGHT - FLOOR_Y, type: 'block', color: 'green' },
            { x: 400, y: FLOOR_Y - 20, width: 20, height: 20, type: 'spike', color: 'red' },
            { x: 700, y: FLOOR_Y - 20, width: 20, height: 20, type: 'spike', color: 'red' }
        ];
    }

    // Start game
    gameLoop();
};
