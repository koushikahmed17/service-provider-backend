import { Injectable } from "@nestjs/common";
import { BkashGatewayService } from "./bkash-gateway.service";
import { NagadGatewayService } from "./nagad-gateway.service";
import { RocketGatewayService } from "./rocket-gateway.service";
import { ILocalGateway } from "../payment-gateway.interface";

export type PaymentGatewayType = "BKASH" | "NAGAD" | "ROCKET";

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly bkashGateway: BkashGatewayService,
    private readonly nagadGateway: NagadGatewayService,
    private readonly rocketGateway: RocketGatewayService
  ) {}

  getGateway(gatewayType: PaymentGatewayType): ILocalGateway {
    switch (gatewayType) {
      case "BKASH":
        return this.bkashGateway;
      case "NAGAD":
        return this.nagadGateway;
      case "ROCKET":
        return this.rocketGateway;
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }

  getAllGateways(): Record<PaymentGatewayType, ILocalGateway> {
    return {
      BKASH: this.bkashGateway,
      NAGAD: this.nagadGateway,
      ROCKET: this.rocketGateway,
    };
  }

  getAvailableGateways(): PaymentGatewayType[] {
    return ["BKASH", "NAGAD", "ROCKET"];
  }
}










