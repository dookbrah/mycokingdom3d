class VirtualJoystick {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.baseRadius = options.baseRadius || 60;
    this.knobRadius = options.knobRadius || 30;
    this.maxDistance = options.maxDistance || 50;
    this.vector = { x: 0, y: 0 };
    this.activePointerId = null;

    this.base = scene.add.circle(x, y, this.baseRadius, 0x111827, 0.36);
    this.base.setStrokeStyle(2, 0xffffff, 0.45);
    this.knob = scene.add.circle(x, y, this.knobRadius, 0xffffff, 0.82);
    this.base.setDepth(1000).setScrollFactor(0);
    this.knob.setDepth(1001).setScrollFactor(0);

    this.setupInput();
  }

  setupInput() {
    this._onPointerDown = (pointer) => {
      if (this.activePointerId !== null || pointer.x >= this.scene.scale.width / 2) return;
      this.activePointerId = pointer.id;
      this.updateFromPointer(pointer);
    };

    this._onPointerMove = (pointer) => {
      if (pointer.id !== this.activePointerId) return;
      this.updateFromPointer(pointer);
    };

    this._onPointerUp = (pointer) => {
      if (pointer.id !== this.activePointerId) return;
      this.activePointerId = null;
      this.vector = { x: 0, y: 0 };
      this.knob.setPosition(this.base.x, this.base.y);
    };

    this.scene.input.on('pointerdown', this._onPointerDown);
    this.scene.input.on('pointermove', this._onPointerMove);
    this.scene.input.on('pointerup', this._onPointerUp);
  }

  updateFromPointer(pointer) {
    const dx = pointer.x - this.base.x;
    const dy = pointer.y - this.base.y;
    const distance = Math.min(Math.hypot(dx, dy), this.maxDistance);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    this.knob.setPosition(this.base.x + x, this.base.y + y);
    this.vector.x = x / this.maxDistance;
    this.vector.y = y / this.maxDistance;
  }

  setPosition(x, y) {
    this.base.setPosition(x, y);
    if (this.activePointerId === null) this.knob.setPosition(x, y);
  }

  getVector() {
    return this.vector;
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onPointerDown);
    this.scene.input.off('pointermove', this._onPointerMove);
    this.scene.input.off('pointerup', this._onPointerUp);
    this.base.destroy();
    this.knob.destroy();
  }
}

class ActionButton {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.radius = options.radius || 50;
    this.color = options.color || 0x3b82f6;
    this.label = options.label || '';
    this.onPress = options.onPress || (() => {});
    this.onRelease = options.onRelease || (() => {});

    this.button = scene.add.circle(x, y, this.radius, this.color, 0.72);
    this.button.setStrokeStyle(2, 0xffffff, 0.5);
    this.button.setDepth(1000).setScrollFactor(0).setInteractive();

    if (this.label) {
      this.text = scene.add.text(x, y, this.label, {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
    }

    this.setupInput();
  }

  setupInput() {
    this.button.on('pointerdown', () => {
      this.button.setScale(0.92);
      this.button.setAlpha(1);
      this.onPress();
    });
    const release = () => {
      this.button.setScale(1);
      this.button.setAlpha(0.72);
      this.onRelease();
    };
    this.button.on('pointerup', release);
    this.button.on('pointerout', release);
    this.button.on('pointerupoutside', release);
  }

  setPosition(x, y) {
    this.button.setPosition(x, y);
    if (this.text) this.text.setPosition(x, y);
  }

  destroy() {
    this.button.destroy();
    if (this.text) this.text.destroy();
  }
}

class MobileControlsManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.joystick = null;
    this.buttons = [];
    this.safe = { top: 0, bottom: 0, sides: 0 };
    this.updateSafeMargins();

    this._onResize = () => this.layout();
    this.scene.scale.on('resize', this._onResize);
  }

  updateSafeMargins() {
    const { width, height } = this.scene.scale;
    this.safe.top = height * 0.05;
    this.safe.bottom = height * 0.05;
    this.safe.sides = width * 0.04;
  }

  addJoystick(options = {}) {
    const position = this.getJoystickPosition(options);
    this.joystick = new VirtualJoystick(this.scene, position.x, position.y, options);
    return this.joystick;
  }

  addButton(options = {}) {
    const position = this.getButtonPosition(this.buttons.length, options);
    const button = new ActionButton(this.scene, position.x, position.y, options);
    this.buttons.push({ button, options });
    return button;
  }

  getJoystickPosition(options = {}) {
    const { height } = this.scene.scale;
    return {
      x: options.x || this.safe.sides + 100,
      y: options.y || height - this.safe.bottom - 100
    };
  }

  getButtonPosition(index, options = {}) {
    const { width, height } = this.scene.scale;
    const spacing = options.spacing || 92;
    return {
      x: options.x || width - this.safe.sides - 80 - index * spacing,
      y: options.y || height - this.safe.bottom - 80
    };
  }

  layout() {
    this.updateSafeMargins();
    if (this.joystick) {
      const position = this.getJoystickPosition(this.options.joystick || {});
      this.joystick.setPosition(position.x, position.y);
    }
    this.buttons.forEach(({ button, options }, index) => {
      const position = this.getButtonPosition(index, options);
      button.setPosition(position.x, position.y);
    });
  }

  getMovement() {
    return this.joystick ? this.joystick.getVector() : { x: 0, y: 0 };
  }

  destroy() {
    this.scene.scale.off('resize', this._onResize);
    if (this.joystick) this.joystick.destroy();
    this.buttons.forEach(({ button }) => button.destroy());
  }
}

export { VirtualJoystick, ActionButton, MobileControlsManager };