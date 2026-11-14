package com.sevnquest.notifier

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.sevnquest.notifier.core.CapturedNotification
import com.sevnquest.notifier.core.Dispatcher
import com.sevnquest.notifier.core.NotificationFilter

/**
 * Menangkap notifikasi dari paket yang dipantau (GoPay, GoPay Merchant, dst.) dan memasukkannya ke
 * antrean kirim. Notifikasi dari aplikasi lain langsung diabaikan tanpa dibaca isinya.
 * Isi notifikasi tidak pernah ditulis ke logcat.
 */
class NotifierListenerService : NotificationListenerService() {

    private val notifierApp: App
        get() = application as App

    override fun onListenerConnected() {
        super.onListenerConnected()
        val app = notifierApp
        app.listenerConnected = true
        app.notifyChanged()

        // Kejar notifikasi yang masuk saat layanan sempat mati (mis. proses dimatikan sistem).
        // Dedup persisten memastikan yang sudah pernah dikirim tidak terkirim lagi.
        val since = app.prefs.activeSince
        if (since > 0L && app.prefs.enabled) {
            val active: Array<StatusBarNotification>? = try {
                activeNotifications
            } catch (e: RuntimeException) {
                null
            }
            if (active != null) {
                for (sbn in active) {
                    if (sbn != null && sbn.postTime >= since) handle(sbn)
                }
            }
        }
        // Sekalian kirim apa pun yang masih tertunda.
        app.kick()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        val app = notifierApp
        app.listenerConnected = false
        app.notifyChanged()
        try {
            NotificationListenerService.requestRebind(app.listenerComponent())
        } catch (e: RuntimeException) {
            // Sistem akan menyambungkan ulang sendiri.
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn != null) handle(sbn)
    }

    private fun handle(sbn: StatusBarNotification) {
        val app = notifierApp
        val prefs = app.prefs
        if (!prefs.enabled) return
        val packageName = sbn.packageName ?: return
        val monitored = prefs.packages
        // Privasi: berhenti di sini untuk semua aplikasi di luar daftar pantau.
        if (!NotificationFilter.isMonitored(packageName, monitored)) return

        val captured = try {
            val notification = sbn.notification ?: return
            val extras = notification.extras ?: return
            val title = (extras.getCharSequence(Notification.EXTRA_TITLE)
                ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG))?.toString()?.trim().orEmpty()
            val text = NotificationFilter.pickText(
                extras.getCharSequence(Notification.EXTRA_TEXT),
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
            )
            CapturedNotification(
                packageName = packageName,
                title = title,
                text = text,
                postedAt = sbn.postTime,
                key = sbn.key ?: (packageName + "|" + sbn.id),
                isGroupSummary = (notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0,
                isOngoing = sbn.isOngoing,
            )
        } catch (e: RuntimeException) {
            // Extras rusak (mis. BadParcelableException): lewati notifikasi ini.
            return
        }

        app.executor.execute {
            val accepted = try {
                app.dispatcher.accept(captured, monitored, true)
            } catch (e: RuntimeException) {
                Dispatcher.Accept.FILTERED
            }
            if (accepted == Dispatcher.Accept.QUEUED) {
                app.notifyChanged()
                app.drainAndReschedule()
            }
        }
    }
}
