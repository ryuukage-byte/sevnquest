package com.sevnquest.notifier

import android.app.Application
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import com.sevnquest.notifier.core.Deduper
import com.sevnquest.notifier.core.Dispatcher
import com.sevnquest.notifier.core.DrainResult
import com.sevnquest.notifier.core.EventLog
import com.sevnquest.notifier.core.HttpUrlTransport
import com.sevnquest.notifier.core.Outbox
import java.io.File
import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class App : Application() {
    lateinit var prefs: Prefs
        private set
    lateinit var outbox: Outbox
        private set
    lateinit var eventLog: EventLog
        private set
    lateinit var dispatcher: Dispatcher
        private set

    /** Satu thread untuk semua pekerjaan disk dan jaringan, supaya urut dan tidak pernah di thread utama. */
    val executor: ExecutorService = Executors.newSingleThreadExecutor()

    @Volatile
    var listenerConnected: Boolean = false

    private val listeners = CopyOnWriteArraySet<Runnable>()

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        val dir = File(filesDir, "data")
        outbox = Outbox(File(dir, "outbox.jsonl"))
        eventLog = EventLog(File(dir, "log.jsonl"))
        dispatcher = Dispatcher(
            outbox = outbox,
            log = eventLog,
            deduper = Deduper(File(dir, "seen.txt")),
            transport = HttpUrlTransport(),
            state = prefs,
        )
    }

    fun addChangeListener(listener: Runnable) {
        listeners.add(listener)
    }

    fun removeChangeListener(listener: Runnable) {
        listeners.remove(listener)
    }

    fun notifyChanged() {
        for (listener in listeners) listener.run()
    }

    /** Menguras antrean di thread latar, lalu menjadwalkan percobaan berikutnya bila perlu. */
    fun kick() {
        executor.execute { drainAndReschedule() }
    }

    /** Harus dipanggil dari [executor]. */
    fun drainAndReschedule() {
        val result = drainSafely()
        SendJobService.reschedule(this, result)
        notifyChanged()
    }

    /** Harus dipanggil dari thread latar. Tidak pernah melempar. */
    fun drainSafely(): DrainResult {
        return try {
            dispatcher.drain()
        } catch (e: RuntimeException) {
            // Jangan sampai layanan mati karena galat tak terduga; coba lagi semenit kemudian.
            val pending = try {
                outbox.size()
            } catch (ignored: RuntimeException) {
                0
            }
            DrainResult(0, pending, if (pending > 0) System.currentTimeMillis() + 60_000L else null, prefs.authBlocked)
        }
    }

    fun listenerComponent(): ComponentName = ComponentName(this, NotifierListenerService::class.java)

    fun isListenerAccessGranted(): Boolean {
        if (Build.VERSION.SDK_INT >= 27) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            return try {
                nm.isNotificationListenerAccessGranted(listenerComponent())
            } catch (e: RuntimeException) {
                false
            }
        }
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
        val me = listenerComponent()
        return flat.split(':').any { ComponentName.unflattenFromString(it) == me }
    }

    /** Meminta sistem menyambungkan ulang listener bila izin ada tetapi layanan tidak tersambung. */
    fun requestListenerRebind() {
        if (listenerConnected || !isListenerAccessGranted()) return
        try {
            NotificationListenerService.requestRebind(listenerComponent())
        } catch (e: RuntimeException) {
            // Sebagian perangkat menolak; sistem akan menyambungkan sendiri nanti.
        }
    }
}
