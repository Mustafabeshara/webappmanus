/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily disabling failing services
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { AI_SERVICE } from "@shared/constants";

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  /** Number of failures before circuit opens */
  failureThreshold: number;
  /** Time in ms before circuit transitions from OPEN to HALF_OPEN */
  resetTimeout: number;
  /** Number of successful requests needed to close circuit from HALF_OPEN */
  successThreshold: number;
  /** Name for logging purposes */
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: AI_SERVICE.CIRCUIT_BREAKER_THRESHOLD,
  resetTimeout: AI_SERVICE.CIRCUIT_BREAKER_RESET_MS,
  successThreshold: 2,
  name: "default",
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Check if circuit allows requests
   */
  canExecute(): boolean {
    this.checkStateTransition();
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkStateTransition();
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      console.log(
        `[CircuitBreaker:${this.config.name}] Circuit is OPEN, rejecting request`
      );
      throw new CircuitBreakerError(
        `Circuit breaker is open for ${this.config.name}`,
        this.config.name
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  onSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.failures = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed operation
   */
  onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.successes = 0;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open trips the circuit again
      this.transitionTo(CircuitState.OPEN);
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failures >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    console.log(
      `[CircuitBreaker:${this.config.name}] Force state change: ${this.state} -> ${state}`
    );
    this.state = state;
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    console.log(`[CircuitBreaker:${this.config.name}] Reset to CLOSED state`);
  }

  private checkStateTransition(): void {
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.config.resetTimeout
    ) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    console.log(
      `[CircuitBreaker:${this.config.name}] State transition: ${this.state} -> ${newState}`
    );
    this.state = newState;

    if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
      this.failures = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
    }
  }
}

/**
 * Custom error for circuit breaker rejections
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Factory for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({ ...config, name })
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Singleton registry for application-wide circuit breakers
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for AI providers
export const aiCircuitBreakers = {
  groq: circuitBreakerRegistry.get("Groq", {
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    successThreshold: 2,
  }),
  gemini: circuitBreakerRegistry.get("Gemini", {
    failureThreshold: 3,
    resetTimeout: 60000,
    successThreshold: 2,
  }),
  openai: circuitBreakerRegistry.get("OpenAI", {
    failureThreshold: 3,
    resetTimeout: 60000,
    successThreshold: 2,
  }),
};

/**
 * Get circuit breaker for a provider by name
 */
export function getCircuitBreaker(providerName: string): CircuitBreaker {
  const key = providerName.toLowerCase() as keyof typeof aiCircuitBreakers;
  return aiCircuitBreakers[key] || circuitBreakerRegistry.get(providerName);
}
