'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing real-time status updates on vehicle requests and trip statuses to Fleet Managers.
 *
 * - getRealTimeStatusUpdates - A function that determines the fastest notification tool and sends real-time updates.
 * - RealTimeStatusUpdatesInput - The input type for the getRealTimeStatusUpdates function.
 * - RealTimeStatusUpdatesOutput - The return type for the getRealTimeStatusUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeStatusUpdatesInputSchema = z.object({
  fleetManagerId: z.string().describe('The ID of the Fleet Manager.'),
  requestId: z.string().describe('The ID of the vehicle request.'),
  tripStatus: z.string().describe('The current status of the trip (e.g., Pending, Approved, Queued, Denied, Completed, Active).'),
  vehicleId: z.string().optional().describe('The ID of the vehicle assigned to the trip, if applicable.'),
  driverId: z.string().optional().describe('The ID of the driver assigned to the trip, if applicable.'),
  message: z.string().describe('A descriptive message about the status update.'),
});
export type RealTimeStatusUpdatesInput = z.infer<typeof RealTimeStatusUpdatesInputSchema>;

const RealTimeStatusUpdatesOutputSchema = z.object({
  notificationMethod: z.string().describe('The notification method used (email, SMS, or push notification).'),
  success: z.boolean().describe('Whether the notification was sent successfully.'),
  messageId: z.string().optional().describe('The ID of the notification message (e.g., email message ID, SMS SID).'),
});
export type RealTimeStatusUpdatesOutput = z.infer<typeof RealTimeStatusUpdatesOutputSchema>;

export async function getRealTimeStatusUpdates(input: RealTimeStatusUpdatesInput): Promise<RealTimeStatusUpdatesOutput> {
  return realTimeStatusUpdatesFlow(input);
}

const sendEmail = ai.defineTool(
  {
    name: 'sendEmail',
    description: 'Sends an email notification to the Fleet Manager.',
    inputSchema: z.object({
      fleetManagerId: z.string().describe('The ID of the Fleet Manager.'),
      subject: z.string().describe('The subject of the email.'),
      body: z.string().describe('The body of the email.'),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the email was sent successfully.'),
      messageId: z.string().optional().describe('The ID of the email message.'),
    }),
  },
  async input => {
    // TODO: Implement email sending logic here (e.g., using Nodemailer, SendGrid).
    // Assume success for now.
    console.log(`Sending email to Fleet Manager ${input.fleetManagerId} with subject: ${input.subject}`);
    return {
      success: true,
      messageId: 'fake-email-message-id',
    };
  }
);

const sendSMS = ai.defineTool(
  {
    name: 'sendSMS',
    description: 'Sends an SMS notification to the Fleet Manager.',
    inputSchema: z.object({
      fleetManagerId: z.string().describe('The ID of the Fleet Manager.'),
      message: z.string().describe('The SMS message to send.'),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the SMS was sent successfully.'),
      messageId: z.string().optional().describe('The ID of the SMS message.'),
    }),
  },
  async input => {
    // TODO: Implement SMS sending logic here (e.g., using Twilio, Vonage).
    // Assume success for now.
    console.log(`Sending SMS to Fleet Manager ${input.fleetManagerId} with message: ${input.message}`);
    return {
      success: true,
      messageId: 'fake-sms-message-id',
    };
  }
);

const sendPushNotification = ai.defineTool(
  {
    name: 'sendPushNotification',
    description: 'Sends a push notification to the Fleet Manager mobile app.',
    inputSchema: z.object({
      fleetManagerId: z.string().describe('The ID of the Fleet Manager.'),
      title: z.string().describe('The title of the push notification.'),
      body: z.string().describe('The body of the push notification.'),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the push notification was sent successfully.'),
      messageId: z.string().optional().describe('The ID of the push notification.'),
    }),
  },
  async input => {
    // TODO: Implement push notification sending logic here (e.g., using Firebase Cloud Messaging, APNs).
    // Assume success for now.
    console.log(`Sending push notification to Fleet Manager ${input.fleetManagerId} with title: ${input.title}`);
    return {
      success: true,
      messageId: 'fake-push-notification-id',
    };
  }
);

const realTimeStatusUpdatesPrompt = ai.definePrompt({
  name: 'realTimeStatusUpdatesPrompt',
  tools: [sendEmail, sendSMS, sendPushNotification],
  input: {schema: RealTimeStatusUpdatesInputSchema},
  output: {schema: RealTimeStatusUpdatesOutputSchema},
  prompt: `You are an AI assistant responsible for providing real-time status updates to Fleet Managers on vehicle requests and trip statuses.

  Based on the following information, determine the fastest and most appropriate notification method (email, SMS, or push notification) to inform the Fleet Manager about the update.

  Consider the urgency of the update, the Fleet Manager's notification preferences (if available), and the reliability of each notification method.

  Input:
  Fleet Manager ID: {{{fleetManagerId}}}
  Request ID: {{{requestId}}}
  Trip Status: {{{tripStatus}}}
  Vehicle ID: {{{vehicleId}}}
  Driver ID: {{{driverId}}}
  Message: {{{message}}}

  Instructions:
  1. Analyze the input data to understand the context of the update.
  2. Determine the fastest and most appropriate notification method based on the factors mentioned above.
  3. Use the corresponding tool (sendEmail, sendSMS, or sendPushNotification) to send the notification.
  4. Return the notificationMethod used and the success status.

  Output:
  {
    "notificationMethod": "<email|SMS|push notification>",
    "success": <true|false>,
    "messageId": "<notification message ID>"
  }`,
});

const realTimeStatusUpdatesFlow = ai.defineFlow(
  {
    name: 'realTimeStatusUpdatesFlow',
    inputSchema: RealTimeStatusUpdatesInputSchema,
    outputSchema: RealTimeStatusUpdatesOutputSchema,
  },
  async input => {
    const {output} = await realTimeStatusUpdatesPrompt(input);
    return output!;
  }
);
