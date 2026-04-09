import { randomUUID } from "node:crypto";

import { PoolClient } from "pg";

import { Notification, NotificationType } from "@/lib/types";

type NotificationInsertInput = {
  userId: string;
  type: NotificationType;
  message: string;
};

export type NotificationHookPayload = Notification;

type NotificationChannelHook = (payload: NotificationHookPayload) => Promise<void>;

const emailHook: NotificationChannelHook = async () => {
  // MVP placeholder. Wire an email provider here later.
};

const smsHook: NotificationChannelHook = async () => {
  // MVP placeholder. Wire an SMS provider here later.
};

function toNotification(input: NotificationInsertInput): Notification {
  return {
    id: randomUUID(),
    userId: input.userId,
    type: input.type,
    message: input.message,
    createdAt: new Date().toISOString()
  };
}

export async function insertNotifications(client: PoolClient, inputs: NotificationInsertInput[]) {
  const notifications = inputs.map(toNotification);

  for (const notification of notifications) {
    await client.query(
      "INSERT INTO notifications (id, user_id, type, message, created_at) VALUES ($1, $2, $3, $4, $5)",
      [notification.id, notification.userId, notification.type, notification.message, notification.createdAt]
    );
  }

  return notifications;
}

export async function runNotificationHooks(notifications: Notification[]) {
  await Promise.allSettled(
    notifications.flatMap((notification) => [emailHook(notification), smsHook(notification)])
  );
}
