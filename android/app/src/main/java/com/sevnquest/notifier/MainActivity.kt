package com.sevnquest.notifier

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import com.sevnquest.notifier.core.LogEntry
import com.sevnquest.notifier.core.LogResult
import com.sevnquest.notifier.core.Packages
import com.sevnquest.notifier.core.RetryReason
import com.sevnquest.notifier.core.Rupiah
import com.sevnquest.notifier.core.Secrets
import com.sevnquest.notifier.core.SendOutcome
import com.sevnquest.notifier.core.SetupLink
import com.sevnquest.notifier.core.SetupResult
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    private lateinit var app: App

    private lateinit var textSummary: TextView
    private lateinit var bannerAuth: TextView
    private lateinit var switchEnabled: Switch
    private lateinit var textAccess: TextView
    private lateinit var textAccessHint: TextView
    private lateinit var btnAppInfo: Button
    private lateinit var textBattery: TextView
    private lateinit var btnBattery: Button
    private lateinit var textEndpoint: TextView
    private lateinit var textKey: TextView
    private lateinit var textTest: TextView
    private lateinit var btnTest: Button
    private lateinit var textPackages: TextView
    private lateinit var textQueue: TextView
    private lateinit var btnSendNow: Button
    private lateinit var textLogEmpty: TextView
    private lateinit var logContainer: LinearLayout
    private lateinit var btnClearLog: Button

    private var resumed = false
    private var testInFlight = false
    private val timeFormat = SimpleDateFormat("d MMM HH.mm.ss", Locale.forLanguageTag("id-ID"))

    private val onDataChanged = Runnable {
        runOnUiThread {
            if (resumed) refresh()
        }
    }

    private val onSwitchChanged = CompoundButton.OnCheckedChangeListener { _, isChecked ->
        val prefs = app.prefs
        if (isChecked && !prefs.enabled) prefs.activeSince = System.currentTimeMillis()
        prefs.enabled = isChecked
        if (isChecked) {
            app.requestListenerRebind()
            app.kick()
        }
        refresh()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = application as App
        setContentView(R.layout.activity_main)

        textSummary = findViewById(R.id.text_summary)
        bannerAuth = findViewById(R.id.banner_auth)
        switchEnabled = findViewById(R.id.switch_enabled)
        textAccess = findViewById(R.id.text_access)
        textAccessHint = findViewById(R.id.text_access_hint)
        btnAppInfo = findViewById(R.id.btn_app_info)
        textBattery = findViewById(R.id.text_battery)
        btnBattery = findViewById(R.id.btn_battery)
        textEndpoint = findViewById(R.id.text_endpoint)
        textKey = findViewById(R.id.text_key)
        textTest = findViewById(R.id.text_test)
        btnTest = findViewById(R.id.btn_test)
        textPackages = findViewById(R.id.text_packages)
        textQueue = findViewById(R.id.text_queue)
        btnSendNow = findViewById(R.id.btn_send_now)
        textLogEmpty = findViewById(R.id.text_log_empty)
        logContainer = findViewById(R.id.log_container)
        btnClearLog = findViewById(R.id.btn_clear_log)

        findViewById<Button>(R.id.btn_open_access).setOnClickListener { openListenerSettings() }
        btnAppInfo.setOnClickListener { openAppInfo() }
        btnBattery.setOnClickListener { requestBatteryExemption() }
        findViewById<Button>(R.id.btn_edit_conn).setOnClickListener { showConnectionDialog() }
        btnTest.setOnClickListener { sendTest() }
        findViewById<Button>(R.id.btn_edit_packages).setOnClickListener { showPackagesDialog() }
        btnSendNow.setOnClickListener {
            app.executor.execute {
                app.outbox.makeAllDue()
                app.drainAndReschedule()
            }
        }
        btnClearLog.setOnClickListener {
            app.executor.execute {
                app.eventLog.clear()
                app.notifyChanged()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumed = true
        app.addChangeListener(onDataChanged)
        app.requestListenerRebind()
        refresh()
        app.kick()
    }

    override fun onPause() {
        resumed = false
        app.removeChangeListener(onDataChanged)
        super.onPause()
    }

    // ------------------------------------------------------------------ tampilan

    private fun refresh() {
        val prefs = app.prefs
        val config = prefs.config()
        val accessGranted = app.isListenerAccessGranted()
        val authBlocked = prefs.authBlocked
        val packages = prefs.packages
        val entries = app.eventLog.entries()
        val pending = app.outbox.size()

        switchEnabled.setOnCheckedChangeListener(null)
        switchEnabled.isChecked = prefs.enabled
        switchEnabled.setOnCheckedChangeListener(onSwitchChanged)

        val (summary, summaryColor) = when {
            !prefs.enabled -> getString(R.string.summary_disabled) to R.color.status_warn
            config == null -> getString(R.string.summary_need_config) to R.color.status_warn
            authBlocked -> getString(R.string.summary_auth_blocked) to R.color.status_error
            !accessGranted -> getString(R.string.summary_need_access) to R.color.status_warn
            packages.isEmpty() -> getString(R.string.summary_no_packages) to R.color.status_warn
            else -> getString(R.string.summary_ready, packages.size) to R.color.status_ok
        }
        textSummary.text = summary
        textSummary.setTextColor(getColor(summaryColor))

        if (authBlocked) {
            val code = entries.firstOrNull { it.result == LogResult.AUTH_FAILED }?.detail ?: "invalid_key"
            bannerAuth.text = getString(R.string.banner_auth, code)
            bannerAuth.visibility = View.VISIBLE
        } else {
            bannerAuth.visibility = View.GONE
        }

        // Akses notifikasi
        if (accessGranted) {
            textAccess.setText(if (app.listenerConnected) R.string.access_granted_connected else R.string.access_granted_waiting)
            textAccess.setTextColor(getColor(R.color.status_ok))
        } else {
            textAccess.setText(R.string.access_denied)
            textAccess.setTextColor(getColor(R.color.status_error))
        }
        val showRestrictedHint = !accessGranted && Build.VERSION.SDK_INT >= 33
        textAccessHint.visibility = if (showRestrictedHint) View.VISIBLE else View.GONE
        btnAppInfo.visibility = if (showRestrictedHint) View.VISIBLE else View.GONE

        // Baterai
        val exempt = isBatteryExempt()
        textBattery.setText(if (exempt) R.string.battery_exempt else R.string.battery_optimized)
        textBattery.setTextColor(getColor(if (exempt) R.color.status_ok else R.color.status_warn))
        btnBattery.visibility = if (exempt) View.GONE else View.VISIBLE

        // Koneksi
        if (config == null) {
            textEndpoint.setText(R.string.conn_none)
            textKey.visibility = View.GONE
        } else {
            textEndpoint.text = getString(R.string.conn_endpoint, config.endpoint)
            textKey.text = getString(R.string.conn_key, Secrets.mask(config.key))
            textKey.visibility = View.VISIBLE
        }
        if (!testInFlight) {
            val lastTest = prefs.lastTest
            if (lastTest == null) {
                textTest.visibility = View.GONE
            } else {
                textTest.text = getString(R.string.test_last, timeFormat.format(Date(prefs.lastTestAt)), lastTest)
                textTest.visibility = View.VISIBLE
            }
        }
        btnTest.isEnabled = !testInFlight

        // Paket
        textPackages.text = if (packages.isEmpty()) {
            getString(R.string.packages_empty)
        } else {
            packages.joinToString("\n") { if (isInstalled(it)) getString(R.string.package_installed, it) else it }
        }

        // Antrean
        textQueue.text = when {
            pending == 0 -> getString(R.string.queue_empty)
            authBlocked -> getString(R.string.queue_blocked, pending)
            else -> getString(R.string.queue_pending, pending)
        }
        btnSendNow.visibility = if (pending > 0 && !authBlocked && config != null) View.VISIBLE else View.GONE

        // Log
        logContainer.removeAllViews()
        textLogEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
        btnClearLog.visibility = if (entries.isEmpty()) View.GONE else View.VISIBLE
        val inflater = LayoutInflater.from(this)
        for (entry in entries) {
            val row = inflater.inflate(R.layout.item_log, logContainer, false)
            val isTest = entry.packageName == packageName
            val source = if (isTest) getString(R.string.log_source_test) else entry.packageName
            row.findViewById<TextView>(R.id.log_source).text =
                getString(R.string.log_line_source, timeFormat.format(Date(entry.time)), source)
            val resultText = describeResult(entry)
            val amount = entry.amount
            val resultView = row.findViewById<TextView>(R.id.log_result)
            resultView.text = if (amount != null) {
                getString(R.string.log_line_result_amount, Rupiah.format(amount), resultText)
            } else {
                resultText
            }
            resultView.setTextColor(getColor(colorFor(entry.result)))
            logContainer.addView(row)
        }
    }

    private fun describeResult(entry: LogEntry): String {
        val detail = entry.detail
        return when (entry.result) {
            LogResult.APPROVED -> {
                val code = entry.orderCode
                if (code.isNullOrEmpty()) getString(R.string.result_approved) else getString(R.string.result_approved_code, code)
            }
            LogResult.UNMATCHED -> getString(R.string.result_unmatched)
            LogResult.AMBIGUOUS -> getString(R.string.result_ambiguous)
            LogResult.NO_AMOUNT -> getString(if (detail == "test") R.string.result_test_ok else R.string.result_no_amount)
            LogResult.RETRY -> {
                val reason = detail ?: "network"
                when (reason) {
                    "network" -> getString(R.string.result_retry_network)
                    "bad_response" -> getString(R.string.result_retry_bad_response)
                    else -> getString(R.string.result_retry_http, "HTTP " + reason.removePrefix("http_"))
                }
            }
            LogResult.AUTH_FAILED -> getString(R.string.result_auth_failed, detail ?: "invalid_key")
            LogResult.REJECTED -> getString(R.string.result_rejected, detail ?: "?")
            LogResult.EXPIRED -> getString(R.string.result_expired)
            LogResult.QUEUE_FULL -> getString(R.string.result_queue_full, detail ?: "1")
            else -> entry.result
        }
    }

    private fun colorFor(result: String): Int = when (result) {
        LogResult.APPROVED -> R.color.status_ok
        LogResult.AUTH_FAILED, LogResult.REJECTED, LogResult.EXPIRED, LogResult.QUEUE_FULL -> R.color.status_error
        LogResult.RETRY, LogResult.AMBIGUOUS -> R.color.status_warn
        else -> R.color.text
    }

    private fun isInstalled(packageName: String): Boolean {
        return try {
            packageManager.getApplicationInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        } catch (e: RuntimeException) {
            false
        }
    }

    private fun isBatteryExempt(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    // ------------------------------------------------------------------ tindakan

    private fun openListenerSettings() {
        val intents = ArrayList<Intent>()
        if (Build.VERSION.SDK_INT >= 30) {
            intents.add(
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                    Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                    app.listenerComponent().flattenToString(),
                )
            )
        }
        intents.add(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        startFirstAvailable(intents)
    }

    private fun openAppInfo() {
        startFirstAvailable(
            listOf(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        )
    }

    @SuppressLint("BatteryLife")
    private fun requestBatteryExemption() {
        startFirstAvailable(
            listOf(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")),
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
            )
        )
    }

    private fun startFirstAvailable(intents: List<Intent>) {
        for (intent in intents) {
            try {
                startActivity(intent)
                return
            } catch (e: ActivityNotFoundException) {
                // coba berikutnya
            } catch (e: SecurityException) {
                // coba berikutnya
            }
        }
        Toast.makeText(this, R.string.err_open_settings, Toast.LENGTH_LONG).show()
    }

    private fun showConnectionDialog() {
        val current = app.prefs.config()
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_connection, null)
        val inputEndpoint = view.findViewById<EditText>(R.id.input_endpoint)
        val inputKey = view.findViewById<EditText>(R.id.input_key)
        val textError = view.findViewById<TextView>(R.id.text_conn_error)
        if (current != null) {
            inputEndpoint.setText(current.endpoint)
            inputKey.setHint(R.string.hint_key_keep)
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.dialog_conn_title)
            .setView(view)
            .setPositiveButton(R.string.btn_save, null)
            .setNegativeButton(R.string.btn_cancel, null)
            .create()
        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                val typedKey = inputKey.text.toString().trim()
                val key = if (typedKey.isEmpty() && current != null) current.key else typedKey
                when (val result = SetupLink.validate(inputEndpoint.text.toString(), key)) {
                    is SetupResult.Valid -> {
                        SetupActivity.save(app, result.config)
                        dialog.dismiss()
                        Toast.makeText(this, R.string.saved, Toast.LENGTH_SHORT).show()
                        refresh()
                    }
                    is SetupResult.Invalid -> {
                        textError.setText(SetupActivity.messageFor(result.error))
                        textError.visibility = View.VISIBLE
                    }
                }
            }
        }
        dialog.show()
    }

    private fun showPackagesDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_packages, null)
        val input = view.findViewById<EditText>(R.id.input_packages)
        val textError = view.findViewById<TextView>(R.id.text_packages_error)
        input.setText(Packages.serialize(app.prefs.packages))

        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.dialog_packages_title)
            .setView(view)
            .setPositiveButton(R.string.btn_save, null)
            .setNegativeButton(R.string.btn_cancel, null)
            .setNeutralButton(R.string.btn_default, null)
            .create()
        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_NEUTRAL).setOnClickListener {
                input.setText(Packages.serialize(Packages.DEFAULT))
                textError.visibility = View.GONE
            }
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                val parsed = Packages.parseList(input.text.toString())
                when {
                    parsed.invalid.isNotEmpty() -> {
                        textError.text = getString(R.string.err_packages_invalid, parsed.invalid.joinToString(", "))
                        textError.visibility = View.VISIBLE
                    }
                    parsed.valid.isEmpty() -> {
                        textError.setText(R.string.err_packages_empty)
                        textError.visibility = View.VISIBLE
                    }
                    else -> {
                        app.prefs.packages = parsed.valid
                        dialog.dismiss()
                        Toast.makeText(this, R.string.saved, Toast.LENGTH_SHORT).show()
                        refresh()
                    }
                }
            }
        }
        dialog.show()
    }

    private fun sendTest() {
        val config = app.prefs.config()
        if (config == null) {
            Toast.makeText(this, R.string.test_need_config, Toast.LENGTH_LONG).show()
            return
        }
        if (testInFlight) return
        testInFlight = true
        btnTest.isEnabled = false
        textTest.setText(R.string.test_sending)
        textTest.visibility = View.VISIBLE

        val appContext = app
        appContext.executor.execute {
            val outcome = try {
                appContext.dispatcher.sendTest(config, appContext.packageName)
            } catch (e: RuntimeException) {
                SendOutcome.Retry(RetryReason.NETWORK)
            }
            val message = when (outcome) {
                is SendOutcome.Delivered -> appContext.getString(R.string.test_ok, outcome.result)
                is SendOutcome.AuthFailed -> appContext.getString(R.string.test_auth, outcome.error)
                is SendOutcome.Rejected -> appContext.getString(R.string.test_rejected, outcome.status)
                is SendOutcome.Retry -> when (outcome.reason) {
                    RetryReason.NETWORK -> appContext.getString(R.string.test_network)
                    RetryReason.BAD_RESPONSE -> appContext.getString(R.string.test_bad_response)
                    else -> appContext.getString(R.string.test_http, outcome.status)
                }
            }
            appContext.prefs.saveLastTest(message, System.currentTimeMillis())
            // Bila uji berhasil setelah kunci sempat ditolak, antrean yang tertahan ikut dikirim.
            if (outcome is SendOutcome.Delivered) appContext.drainAndReschedule()
            runOnUiThread {
                testInFlight = false
                if (resumed) refresh()
            }
        }
    }
}
