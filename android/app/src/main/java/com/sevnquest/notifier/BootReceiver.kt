package com.sevnquest.notifier

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Setelah HP menyala atau aplikasi diperbarui: sambungkan lagi listener dan lanjutkan antrean. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val app = context?.applicationContext as? App ?: return
        app.requestListenerRebind()
        val pending = goAsync()
        app.executor.execute {
            try {
                // Job menjamin proses tetap hidup selama pengiriman; cukup dijadwalkan dari sini.
                if (app.outbox.size() > 0 && !app.prefs.authBlocked && app.prefs.config() != null) {
                    SendJobService.schedule(app, 0L)
                }
            } catch (e: RuntimeException) {
                // abaikan
            } finally {
                pending.finish()
            }
        }
    }
}
