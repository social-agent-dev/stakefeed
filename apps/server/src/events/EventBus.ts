import { EventEmitter } from "events";

class StakeFeedEventBus extends EventEmitter {
  private static instance: StakeFeedEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): StakeFeedEventBus {
    if (!StakeFeedEventBus.instance) {
      StakeFeedEventBus.instance = new StakeFeedEventBus();
    }
    return StakeFeedEventBus.instance;
  }
}

export const eventBus = StakeFeedEventBus.getInstance();
