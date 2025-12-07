/**
 * Sound Notification System using Web Audio API
 * Plays different sounds for different notification priorities
 */

class SoundNotificationService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("soundNotifications") !== "false";
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a notification sound based on priority
   * @param type - Type of notification: 'critical', 'warning', 'info', 'success'
   */
  play(type: "critical" | "warning" | "info" | "success" = "info") {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      
      // Resume audio context if suspended (required by browser autoplay policies)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Configure sound based on notification type
      switch (type) {
        case "critical":
          // Urgent alert: High pitch, longer duration, louder
          oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
          oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // A4
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          
          // Play second beep for critical
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.setValueAtTime(880, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.3);
          }, 200);
          break;

        case "warning":
          // Warning: Medium pitch, moderate duration
          oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5
          oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // A4
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;

        case "success":
          // Success: Pleasant ascending tone
          oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
          oscillator.frequency.exponentialRampToValueAtTime(659, ctx.currentTime + 0.1); // E5
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;

        case "info":
        default:
          // Info: Gentle, short beep
          oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
      }

      oscillator.type = "sine";
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }

  /**
   * Enable or disable sound notifications
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("soundNotifications", enabled.toString());
    }
  }

  /**
   * Check if sound notifications are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play sound based on notification type from database
   */
  playForNotificationType(notificationType: string) {
    // Map notification types to sound priorities
    const criticalTypes = [
      "budget_exceeded",
      "budget_threshold",
      "compliance_issue",
      "urgent_approval",
    ];

    const warningTypes = [
      "expense_approval",
      "tender_approval",
      "low_stock",
      "delivery_scheduled",
    ];

    const successTypes = [
      "expense_approved",
      "tender_approved",
      "delivery_completed",
    ];

    if (criticalTypes.includes(notificationType)) {
      this.play("critical");
    } else if (warningTypes.includes(notificationType)) {
      this.play("warning");
    } else if (successTypes.includes(notificationType)) {
      this.play("success");
    } else {
      this.play("info");
    }
  }
}

// Export singleton instance
export const soundNotifications = new SoundNotificationService();
