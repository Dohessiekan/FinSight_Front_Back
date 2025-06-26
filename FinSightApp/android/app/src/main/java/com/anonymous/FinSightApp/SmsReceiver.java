package com.anonymous.FinSightApp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        SmsMessage sms = SmsMessage.createFromPdu((byte[]) pdu);
                        String messageBody = sms.getMessageBody();
                        String sender = sms.getDisplayOriginatingAddress();
                        Log.d("SmsReceiver", "SMS from: " + sender + ", message: " + messageBody);
                        // Show notification
                        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "sms_channel")
                                .setSmallIcon(android.R.drawable.ic_dialog_info)
                                .setContentTitle("New SMS Received")
                                .setContentText("Tap to scan for fraud.")
                                .setPriority(NotificationCompat.PRIORITY_HIGH)
                                .setAutoCancel(true);
                        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
                    }
                }
            }
        }
    }
}
