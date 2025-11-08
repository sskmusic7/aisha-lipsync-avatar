/**
 * Backup of the original "normalized" movement algorithm (motion option 3).
 * -----------------------------------------------------------------------------
 * This file intentionally preserves the NormalizedFaceTrackerController exactly
 * as it was when option 3 was first implemented. The live controller in
 * `browserAvatarTracking.js` may evolve over time; keep this copy untouched so
 * we can easily restore or compare behaviour whenever needed.
 *
 * To reuse it, simply import { NormalizedFaceTrackerControllerBackup } from
 * this file and wire it into the tracker config.
 */
export class NormalizedFaceTrackerControllerBackup {
  constructor() {
    // Key Parameters from algorithm
    this.maxHeadYaw = 55;      // 45-60° range (how far head turns horizontally)
    this.maxHeadPitch = 35;     // 30-40° range (how far head tilts up/down)
    this.maxBodyYaw = 25;       // 20-30° range (body rotation range)
    this.bodyFollowFactor = 0.4; // 0.3-0.5 (body follows 30-50% of head movement)
    this.smoothingFactor = 0.2;  // 0.15-0.25 (lower = smoother but more lag)
    this.deadzone = 0.05;        // Reduces micro-jitter in center

    // Eye gaze offset (eyes lead the head slightly)
    this.eyeOffsetX = 5;  // 5° additional rotation
    this.eyeOffsetY = 3;  // 3° additional rotation

    // Current smoothed values (in degrees)
    this.currentHeadYaw = 0;
    this.currentHeadPitch = 0;
    this.currentBodyYaw = 0;
    this.currentEyeX = 0;
    this.currentEyeY = 0;

    this.lastDetectionTime = performance.now();
  }

  lerp(current, target, factor) {
    return current + (target - current) * factor;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  applyDeadzone(value) {
    if (Math.abs(value) < this.deadzone) {
      return 0;
    }
    const sign = Math.sign(value);
    const adjusted = (Math.abs(value) - this.deadzone) / (1 - this.deadzone);
    return sign * adjusted;
  }

  normalizeFacePosition(faceData) {
    return {
      normX: (faceData.x - 0.5) * 2, // Convert to range [-1, 1]
      normY: (faceData.y - 0.5) * 2
    };
  }

  calculateHeadRotation(normX, normY) {
    const rawHeadYaw = normX * this.maxHeadYaw;
    const rawHeadPitch = -normY * this.maxHeadPitch;

    return {
      yaw: this.clamp(rawHeadYaw, -this.maxHeadYaw, this.maxHeadYaw),
      pitch: this.clamp(rawHeadPitch, -this.maxHeadPitch, this.maxHeadPitch)
    };
  }

  calculateBodyRotation(headYaw) {
    const targetBodyYaw = headYaw * this.bodyFollowFactor;
    return this.clamp(targetBodyYaw, -this.maxBodyYaw, this.maxBodyYaw);
  }

  calculateEyeGaze(headYaw, headPitch, normX, normY) {
    return {
      x: this.clamp(
        headYaw + this.eyeOffsetX * this.applyDeadzone(normX),
        -this.maxHeadYaw,
        this.maxHeadYaw
      ),
      y: this.clamp(
        headPitch + this.eyeOffsetY * this.applyDeadzone(normY),
        -this.maxHeadPitch,
        this.maxHeadPitch
      )
    };
  }

  calculateDistanceFactor(faceData) {
    if (typeof faceData.z === 'number') {
      const limitedZ = this.clamp(faceData.z, 0.2, 0.8);
      return 1.0 + (0.5 - limitedZ) * 0.4;
    }
    return 1.0;
  }

  applySmoothing(target, current) {
    return this.lerp(current, target, this.smoothingFactor);
  }

  formatOutput() {
    return {
      head: {
        x: this.currentHeadYaw,
        y: this.currentHeadPitch
      },
      eyes: {
        x: this.currentEyeX,
        y: this.currentEyeY
      },
      body: {
        y: this.currentBodyYaw
      }
    };
  }

  calculateMovements(faceData) {
    const now = performance.now();

    if (!faceData || !faceData.detected) {
      if (now - this.lastDetectionTime > 1500) {
        this.currentHeadYaw = this.lerp(this.currentHeadYaw, 0, 0.3);
        this.currentHeadPitch = this.lerp(this.currentHeadPitch, 0, 0.3);
        this.currentBodyYaw = this.lerp(this.currentBodyYaw, 0, 0.25);
        this.currentEyeX = this.lerp(this.currentEyeX, 0, 0.35);
        this.currentEyeY = this.lerp(this.currentEyeY, 0, 0.35);
      }
      return this.formatOutput();
    }

    this.lastDetectionTime = now;

    const { normX, normY } = this.normalizeFacePosition(faceData);

    const headRotation = this.calculateHeadRotation(
      this.applyDeadzone(normX),
      this.applyDeadzone(normY)
    );

    const bodyRotation = this.calculateBodyRotation(headRotation.yaw);

    const eyeGaze = this.calculateEyeGaze(
      headRotation.yaw,
      headRotation.pitch,
      normX,
      normY
    );

    const distanceFactor = this.calculateDistanceFactor(faceData);

    const targetHeadYaw = headRotation.yaw * distanceFactor;
    const targetHeadPitch = headRotation.pitch * distanceFactor;
    const targetBodyYaw = bodyRotation * distanceFactor;
    const targetEyeX = eyeGaze.x * distanceFactor;
    const targetEyeY = eyeGaze.y * distanceFactor;

    this.currentHeadYaw = this.applySmoothing(targetHeadYaw, this.currentHeadYaw);
    this.currentHeadPitch = this.applySmoothing(targetHeadPitch, this.currentHeadPitch);
    this.currentBodyYaw = this.applySmoothing(targetBodyYaw, this.currentBodyYaw);
    this.currentEyeX = this.applySmoothing(targetEyeX, this.currentEyeX);
    this.currentEyeY = this.applySmoothing(targetEyeY, this.currentEyeY);

    this.currentBodyYaw = this.clamp(this.currentBodyYaw, -this.maxBodyYaw, this.maxBodyYaw);
    this.currentHeadYaw = this.clamp(this.currentHeadYaw, -this.maxHeadYaw, this.maxHeadYaw);
    this.currentHeadPitch = this.clamp(this.currentHeadPitch, -this.maxHeadPitch, this.maxHeadPitch);
    this.currentEyeX = this.clamp(this.currentEyeX, -this.maxHeadYaw, this.maxHeadYaw);
    this.currentEyeY = this.clamp(this.currentEyeY, -this.maxHeadPitch, this.maxHeadPitch);

    return this.formatOutput();
  }
}

