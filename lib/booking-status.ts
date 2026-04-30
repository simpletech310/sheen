// Helpers shared by the en-route / arrived / start lifecycle routes.
import { sendPushToUser } from "@/lib/push";

type Step = {
  status: string;
  eventType: string;
  pushTitle: string;
  pushBody: string;
};

export const STEPS: Record<string, Step> = {
  en_route: {
    status: "en_route",
    eventType: "en_route",
    pushTitle: "Your pro is on the way",
    pushBody: "Tap to track them in real time.",
  },
  arrived: {
    status: "arrived",
    eventType: "arrived",
    pushTitle: "Your pro just arrived",
    pushBody: "They’re ready to start.",
  },
  in_progress: {
    status: "in_progress",
    eventType: "started",
    pushTitle: "Your wash has started",
    pushBody: "We’ll ping you when it’s done.",
  },
};

export async function notifyCustomerStatus(
  customerId: string,
  bookingId: string,
  step: Step
) {
  return sendPushToUser(customerId, {
    title: step.pushTitle,
    body: step.pushBody,
    url: `/app/tracking/${bookingId}`,
    tag: `booking-${bookingId}`,
  });
}
