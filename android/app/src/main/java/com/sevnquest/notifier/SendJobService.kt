package com.sevnquest.notifier

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import com.sevnquest.notifier.core.DrainResult

/**
 * Pengiriman ulang antrean lewat JobScheduler: dijalankan sistem saat ada jaringan, bertahan
 * setelah HP dinyalakan ulang (persisted), dengan backoff.
 */
class SendJobService : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        val app = application as App
        app.executor.execute {
            val result = app.drainSafely()
            try {
                jobFinished(params, false)
            } catch (e: RuntimeException) {
                // Job sudah dihentikan sistem.
            }
            reschedule(app, result)
            app.notifyChanged()
        }
        return true
    }

    // true = minta sistem menjadwalkan ulang bila job dihentikan di tengah jalan.
    override fun onStopJob(params: JobParameters?): Boolean = true

    companion object {
        private const val JOB_ID = 7101

        /** Menjadwalkan percobaan berikutnya sesuai hasil pengurasan, atau membatalkan job bila tidak perlu. */
        fun reschedule(context: Context, result: DrainResult) {
            val next = result.nextAttemptAt
            if (result.remaining <= 0 || result.authBlocked || next == null) {
                cancel(context)
                return
            }
            schedule(context, Math.max(0L, next - System.currentTimeMillis()))
        }

        fun schedule(context: Context, delayMs: Long) {
            val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler ?: return
            val info = JobInfo.Builder(JOB_ID, ComponentName(context, SendJobService::class.java))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .setMinimumLatency(delayMs)
                .setBackoffCriteria(30_000L, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
                .build()
            try {
                scheduler.schedule(info)
            } catch (e: RuntimeException) {
                // Tidak fatal: antrean tetap di disk dan dikirim saat ada notifikasi berikutnya atau aplikasi dibuka.
            }
        }

        private fun cancel(context: Context) {
            val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler ?: return
            try {
                scheduler.cancel(JOB_ID)
            } catch (e: RuntimeException) {
                // abaikan
            }
        }
    }
}
