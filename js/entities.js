// ---------------------------------------------------------------------------
// Entities: player and NPCs (procedurally drawn pixel characters)
// ---------------------------------------------------------------------------

const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };

class Character {
  constructor(tx, ty, palette) {
    this.x = tx * TILE;          // position in px (top-left of body box)
    this.y = ty * TILE;
    this.dir = DIR.DOWN;
    this.speed = 140;            // px per second
    this.moving = false;
    this.animTime = 0;
    this.palette = palette;      // { skin, hair, shirt, pants }
  }

  get tileX() { return Math.floor((this.x + TILE / 2) / TILE); }
  get tileY() { return Math.floor((this.y + TILE * 0.75) / TILE); }

  // Attempt to move; slides along walls. Collision box = lower half of tile.
  move(dx, dy, dt) {
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return;

    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    else if (dy !== 0) this.dir = dy > 0 ? DIR.DOWN : DIR.UP;

    const len = Math.hypot(dx, dy) || 1;
    const step = this.speed * dt;
    const nx = this.x + (dx / len) * step;
    const ny = this.y + (dy / len) * step;

    // Collision box: 20px wide, 14px tall, at the character's feet
    const box = { ox: 6, oy: 16, w: 20, h: 14 };
    const collides = (cx, cy) => {
      const x0 = Math.floor((cx + box.ox) / TILE);
      const x1 = Math.floor((cx + box.ox + box.w - 1) / TILE);
      const y0 = Math.floor((cy + box.oy) / TILE);
      const y1 = Math.floor((cy + box.oy + box.h - 1) / TILE);
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
          if (isSolid(tx, ty)) return true;
      return false;
    };

    if (!collides(nx, this.y)) this.x = nx;
    if (!collides(this.x, ny)) this.y = ny;

    this.animTime += dt;
  }

  // The tile the character is facing (for tool use / talking)
  facingTile() {
    const offs = [[0, 1], [0, -1], [-1, 0], [1, 0]];   // DOWN, UP, LEFT, RIGHT
    const o = offs[this.dir];
    return { tx: this.tileX + o[0], ty: this.tileY + o[1] };
  }

  draw(ctx, camX, camY) {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const p = this.palette;
    const frame = this.moving ? Math.floor(this.animTime * 8) % 2 : 0;

    ctx.save();
    ctx.translate(sx, sy);
    const P = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x * 4, y * 4, w * 4, h * 4);
    };

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(16, 30, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs (alternate when walking)
    if (frame === 0) {
      P(3, 6, 1, 2, p.pants); P(5, 6, 1, 2, p.pants);
    } else {
      P(3, 6, 1, 1, p.pants); P(5, 6, 1, 2, p.pants);
      P(3, 7, 1, 1, p.pants);
    }

    // body
    P(2, 4, 5, 2, p.shirt);

    // arms
    P(1, 4, 1, 2, p.shirt);
    P(7, 4, 1, 2, p.shirt);

    // head
    P(2, 1, 5, 3, p.skin);

    // hair + face depend on facing
    if (this.dir === DIR.UP) {
      P(2, 0, 5, 2, p.hair);
      P(2, 2, 5, 1, p.hair);
    } else {
      P(2, 0, 5, 1, p.hair);
      P(2, 1, 1, 1, p.hair);
      P(6, 1, 1, 1, p.hair);
      // eyes
      if (this.dir === DIR.DOWN) {
        P(3, 2, 1, 1, "#2b1d0e"); P(5, 2, 1, 1, "#2b1d0e");
      } else if (this.dir === DIR.LEFT) {
        P(3, 2, 1, 1, "#2b1d0e");
      } else {
        P(5, 2, 1, 1, "#2b1d0e");
      }
    }

    ctx.restore();
  }
}

// ---------------- NPC with simple wander AI ----------------
class NPC extends Character {
  constructor(tx, ty, palette, key, name, scene = "outdoor", isStatic = false) {
    super(tx, ty, palette);
    this.key = key;          // index into DIALOGUES (lang.js)
    this.name = name;
    this.scene = scene;      // which scene this NPC lives in
    this.static = isStatic;  // vendors stand still behind their counter
    this.bond = 0;           // hearts, grows on correct dialogue choices
    this.topicIndex = 0;     // rotates through this NPC's conversation topics
    this.speed = 55;
    this.homeX = this.x;
    this.homeY = this.y;
    this.wanderRadius = 3 * TILE;
    this.state = "idle";
    this.stateTimer = 1 + Math.random() * 2;
    this.wanderDir = { x: 0, y: 0 };
    this.paused = false;         // true while talking to the player
  }

  update(dt) {
    if (this.paused || this.static) { this.moving = false; return; }

    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      if (this.state === "idle") {
        this.state = "walk";
        this.stateTimer = 0.8 + Math.random() * 1.5;
        const ang = Math.random() * Math.PI * 2;
        this.wanderDir = { x: Math.cos(ang), y: Math.sin(ang) };
        // steer back home if wandering too far
        const dx = this.homeX - this.x, dy = this.homeY - this.y;
        if (Math.hypot(dx, dy) > this.wanderRadius) {
          const d = Math.hypot(dx, dy) || 1;
          this.wanderDir = { x: dx / d, y: dy / d };
        }
      } else {
        this.state = "idle";
        this.stateTimer = 1.5 + Math.random() * 2.5;
      }
    }

    if (this.state === "walk") {
      this.move(this.wanderDir.x, this.wanderDir.y, dt);
    } else {
      this.moving = false;
    }
  }

  // Face toward a point (used when the player talks to them)
  facePoint(px, py) {
    const dx = px - this.x, dy = py - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    else this.dir = dy > 0 ? DIR.DOWN : DIR.UP;
  }
}
