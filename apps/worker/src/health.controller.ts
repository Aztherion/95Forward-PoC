import { Controller, Get } from "@nestjs/common";
import { buildHealthStatus, type HealthStatus } from "./health";

@Controller("health")
export class HealthController {
  @Get()
  check(): HealthStatus {
    return buildHealthStatus();
  }
}
