import { HomeHero } from "@/components/marketing/home-hero";
import { IncidentInvestigation } from "@/components/marketing/incident-investigation";
import { IntegrationOpenSource } from "@/components/marketing/integration-open-source";
import { ProductionProblem } from "@/components/marketing/production-problem";
import { TelemetryFlow } from "@/components/marketing/telemetry-flow";

export default function Home() {
  return (
    <main>
      <HomeHero />
      <ProductionProblem />
      <TelemetryFlow />
      <IncidentInvestigation />
      <IntegrationOpenSource />
    </main>
  );
}
